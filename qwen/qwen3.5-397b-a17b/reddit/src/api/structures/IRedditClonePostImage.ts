import { tags } from "typia";

export namespace IRedditClonePostImage {
  /**
   * Request body for creating an image reference in an IMAGE type post. Contains the file URI pointing to the uploaded image stored in external file storage. Used as a nested composition within IRedditClonePost.ICreate when creating image posts - the image reference is created atomically with its parent post record.
   */
  export type ICreate = {
    /**
     * URI reference to the uploaded image file stored in external file storage.
     *
     * @x-autobe-database-schema-property file_uri
     * @x-autobe-specification Direct mapping from reddit_clone_post_images.file_uri column (VARCHAR(80000)). Stores URI reference to image file in external storage. Validated as URI format.
     */
    fileUri: string & tags.Format<"uri">;
  };
}
