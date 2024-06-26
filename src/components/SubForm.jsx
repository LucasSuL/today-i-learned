import { useState } from "react";
import { CATEGORIES } from "../../data";
import supabase from "../database.js";
import { usePosts } from "../provider/PostContext";

export default function Form({ lan, head, id, onSubFormSubmit }) {
  const { user } = usePosts();
  const [isUploading, setIsUploading] = useState(false);
  const [translation_text, setTranslation_text] = useState("");

  const handlePost = async (event) => {
    event.preventDefault();

    // 检查用户是否登录
    if (!user) {
      // 用户未登录，显示提示消息
      alert("Please login to submit the form.");
      return; // 中断表单提交
    }

    // Process form data here (e.g., send it to a server)
    if (translation_text) {
      try {
        setIsUploading(true);

        // 检查是否有重复的记录
        const { data: existingTranslation, error: checkError } = await supabase
          .from("translations")
          .select("id")
          .eq("fact_id", id)
          .eq("head", head)
          .eq("language", lan)
          .eq("text", translation_text)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // 116: no data returned
          throw new Error(checkError.message);
        }

        if (existingTranslation) {
          alert(
            "This translation already exists. Please provide a unique translation."
          );
          // reset input fields
          setTranslation_text("");

          setIsUploading(false);
          return; // 中断表单提交
        }

        const { data, error } = await supabase
          .from("translations")
          .insert([
            {
              fact_id: id,
              head: head,
              language: lan,
              text: translation_text,
              vote_sub: 0,
              user_acct: user.email,
              user_name: user.name,
            },
          ])
          .select();

        if (error) {
          throw new Error(error.message);
        }

        // Fact inserted successfully, now update the user's post_head array
        const { data: existingUser, error: userFetchError } = await supabase
          .from("users")
          .select("translations_text")
          .eq("email", user.email)
          .single();

        if (userFetchError) {
          console.error("Error fetching user:", userFetchError.message);
          throw new Error(userFetchError.message);
        }

        // Append the new head to the post_head array
        const updatedPostHead = existingUser.translations_text
          ? [...existingUser.translations_text, translation_text]
          : [translation_text];

        // Update the user's post_head array in the database
        const { data: updatedUser, error: userUpdateError } = await supabase
          .from("users")
          .update({ translations_text: updatedPostHead })
          .eq("email", user.email)
          .select();

        if (userUpdateError) {
          console.error("Error updating user:", userUpdateError.message);
          throw new Error(userUpdateError.message);
        }

        console.log(
          "New fact added and user updated successfully:",
          translation_text,
          updatedUser
        );

        //4-reset input fields
        setTranslation_text("");

        setIsUploading(false);

        //6-close the form
        // setShowForm(false);

        // refresh parent
        onSubFormSubmit();
        confetti();
      } catch (error) {
        console.error("Error inserting fact:", error.message);
      }
    }
  };

  // react form
  const handleChange = (event) => {
    const { value } = event.target;
    setTranslation_text(value);
  };

  return (
    <div className="">
      <form
        className="p-3 mb-3 needs-validation"
        action=""
        onSubmit={handlePost}
        novalidate
      >
        <div className="row">
          <div className="col-6 ">
            <div className="mb-3">
              <label for="validationCustom01" className = "form-label">
                Your translation
              </label>
              <input
                type="text"
                className = "form-control"
                id="validationCustom01"
                value={translation_text}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className = "col-12">
            <div className = "form-check">
              <input
                className = "form-check-input"
                type="checkbox"
                value=""
                id="invalidCheck"
                required
              />
              <label className = "form-check-label" for="invalidCheck">
                Agree to terms and conditions.
              </label>
              <div className = "invalid-feedback">
                You must agree before submitting.
              </div>
              <a
                href="#term"
                className = "link-dark link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover ms-2"
              >
                (See more)
              </a>
            </div>
          </div>
          <div className="col-12 mt-3">
            <button
              type="submit"
              disabled={isUploading}
              className="btn btn-success fw-bold"
              style={{ width: "120px" }}
            >
              {isUploading ? "Uploading..." : "Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
