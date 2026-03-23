export namespace IRedditLikeSearchResult {
  /**
   * Summary of a search result containing either a post or comment with search-specific metadata including relevance scoring and highlights.
   */
  export type ISummary = {
    /**
     * Discriminator field determining search result type (post or comment).
     *
     * @x-autobe-specification Discriminator field determining search result type. Value 'post' indicates SearchResult is IRedditLikePost.ISummary; value 'comment' indicates SearchResult is IRedditLikeComment.ISummary.
     */
    type: string;
  };
}
