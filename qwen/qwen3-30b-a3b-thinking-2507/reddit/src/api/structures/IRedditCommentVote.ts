export namespace IRedditCommentVote {
  /**
   * Request body containing the new vote direction for updating comment votes. Supports 'up', 'down', or 'remove' values.
   */
  export type IUpdate = {
    /**
     * The direction of the vote to apply to the comment (up, down, or remove existing vote)
     *
     * @x-autobe-database-schema-property vote_direction
     * @x-autobe-specification Maps user input 'up'/'down'/'remove' to vote_direction in database. 'remove' triggers soft delete.
     */
    vote: "up" | "down" | "remove";
  };
}
