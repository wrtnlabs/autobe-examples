export namespace IRedditPostVote {
  /**
   * Summary of a single vote on a post, showing whether the vote was an upvote or downvote. Used in post detail page vote listings to display vote direction without revealing voter identity or timestamps.
   */
  export type ISummary = {
    /**
     * Direction of vote (up or down)
     *
     * @x-autobe-database-schema-property direction
     * @x-autobe-specification Vote direction, one of 'up' or 'down'
     */
    direction: string | string;
  };
}
