export namespace IRedditClonePostText {
  /**
   * Request body for creating text content in a TEXT type post. Contains the main body text that appears in the post. Used as a composition within IRedditClonePost.ICreate when post_type is TEXT. The body is required and must be non-empty for text posts.
   */
  export type ICreate = {
    /**
     * The main text content of the post. Required for TEXT type posts. Must be non-empty.
     *
     * @x-autobe-database-schema-property body
     * @x-autobe-specification Direct mapping from reddit_clone_post_texts.body column. Required field with non-empty validation. Stored as TEXT type in database.
     */
    body: string;
  };
}
