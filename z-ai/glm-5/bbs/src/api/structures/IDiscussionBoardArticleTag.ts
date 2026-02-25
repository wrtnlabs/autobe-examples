export namespace IDiscussionBoardArticleTag {
  /**
   * Request body for updating the set of tags associated with an article. Provide an array of tag strings to replace the current tag set. Each tag must be 1-50 characters containing only alphanumeric characters, hyphens, and underscores. Tags are normalized to lowercase server-side. Maximum 15 tags per article. An empty array removes all tags; omitting this property keeps existing tags unchanged.
   */
  export type IUpdate = {
    value?: string | undefined;
  };

  /**
   * Request body for adding tags to an article. Contains the tag value to associate with the article. The tag value is automatically normalized to lowercase and will reference an existing platform tag or create a new one automatically.
   */
  export type ICreate = {
    /**
     * Tag value to associate with the article. The value will be normalized to lowercase and matched to an existing platform tag or used to create a new one automatically. Supports alphanumeric characters, hyphens, and underscores only.
     *
     * @x-autobe-specification User-provided tag text input. Processing pipeline: 1) Trim leading/trailing whitespace, 2) Validate length (1-50 characters), 3) Validate characters (alphanumeric, hyphens, underscores only), 4) Normalize to lowercase for case-insensitive comparison, 5) Lookup in discussion_board_tags table by unique value constraint, 6) Create new tag record in discussion_board_tags if not found, 7) Create association in discussion_board_article_tags linking article to tag. Does not map directly to any discussion_board_article_tags column.
     */
    value: string;
  };
}
