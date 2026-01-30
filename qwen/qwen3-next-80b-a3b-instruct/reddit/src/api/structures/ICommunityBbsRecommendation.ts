import { tags } from "typia";

export namespace ICommunityBbsRecommendation {
  /**
   * Search and pagination parameters for personalized content or community
   * recommendations. Controls how many results are returned and where to
   * start in the result set. May include a minimum quality threshold for
   * recommendations. This object enables users to customize their
   * recommendation experience with pagination controls and quality filters.
   */
  export type IRequest = {
    /**
     * Maximum number of recommendations to return. Must be a positive
     * integer between 1 and 50.
     *
     * @x-autobe-specification Applies LIMIT clause to materialized view query to control number of results. Typically 10-50, defaults to 10.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>)
      | undefined;

    /**
     * Number of recommendations to skip before starting to return results.
     * Used for cursor-based pagination.
     *
     * @x-autobe-specification Applies OFFSET clause to materialized view query for cursor-based pagination. Specifies number of items to skip before starting to return results.
     */
    offset?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Minimum quality score threshold for recommendations. Recommendations
     * with scores below this value will be excluded. Default is 0.7 if not
     * provided.
     *
     * @x-autobe-specification Filters results by minimum recommendation_score from mv_community_bbs_recommendation_scores, default value 0.7 when not provided.
     */
    recommendation_score_threshold?:
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | undefined;
  };

  /**
   * Summarized recommendation entry for content or communities based on
   * personalized algorithmic scores. Included in paginated recommendation
   * responses to provide users with personalized discovery suggestions
   * without requiring additional API calls to fetch full details. Each entry
   * contains the target entity's identifier and its computed recommendation
   * score, allowing the frontend to display a ranked list of recommendations
   * with minimal data.
   *
   * The recommendation_score is the precomputed value from the
   * mv_community_bbs_recommendation_scores materialized view, calculated
   * using user engagement metrics, similarity algorithms, and content
   * popularity factors. The entity_id identifies the recommended item (either
   * a community or post). The type field distinguishes between
   * recommendations for communities versus posts, enabling the UI to render
   * appropriate content previews. The reference_id and reference_type provide
   * additional context when the system needs to link the recommendation to
   * its source entity in the database.
   */
  export type ISummary = {
    /**
     * Unique identifier of the recommended entity (community or post).
     *
     * @x-autobe-specification Direct mapping from mv_community_bbs_recommendation_scores.entity_id column.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of recommended entity: 'community' or 'post'.
     *
     * @x-autobe-specification Direct mapping from mv_community_bbs_recommendation_scores.entity_type column.
     */
    type: "community" | "post";

    /**
     * Composite recommendation score calculated by the recommendation
     * algorithm. Higher scores indicate stronger relevance to the user.
     *
     * @x-autobe-specification Direct mapping from mv_community_bbs_recommendation_scores.score column.
     */
    recommendation_score: number & tags.Minimum<0> & tags.Maximum<1>;

    /**
     * Reference to the actual entity's ID in its respective table. When
     * type is 'community', this is the community's ID. When type is 'post',
     * this is the post's ID. Used by clients to navigate to the detailed
     * view.
     *
     * @x-autobe-specification Computed by joining with target entity table. If entity_type is 'community', contains community_bbs_communities.id. If entity_type is 'post', contains community_bbs_posts.id. May be null if both community_id and post_id are null in the materialized view.
     */
    reference_id: (string & tags.Format<"uuid">) | null;
  };
}
