import { tags } from "typia";

export namespace IDiscussionBoardSearch {
  /**
   * Summary representation of a citizen user in the discussion board system,
   * optimized for list views and search results. Contains essential user
   * metadata for display purposes while excluding sensitive or
   * computationally expensive fields. This schema is used in paginated user
   * lists and search result endpoints, providing contextual information about
   * users without exposing detailed personal information or internal system
   * data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the citizen user account. Used as primary key
     * in the discussion_board_citizen table and referenced in related
     * entities such as articles, comments, and moderation actions.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name of the citizen used in forum interactions. Must
     * be unique across the system and follow naming conventions for user
     * visibility and discoverability. This field is derived from the
     * username column in the discussion_board_citizen table.
     */
    username: string & tags.MinLength<1> & tags.MaxLength<50>;

    /**
     * Timestamp when the citizen account was created in the system.
     * Provides context for user longevity and engagement history. This
     * field is derived from the created_at column in the
     * discussion_board_citizen table and is immutable after account
     * creation.
     */
    registration_date: string & tags.Format<"date-time">;

    /**
     * Overall trust score calculated based on positive interactions,
     * content contributions, and adherence to community guidelines. Higher
     * scores indicate more trusted members who are less likely to violate
     * platform policies. This field is derived from the citizen_trust_score
     * column in the discussion_board_citizen_trust_scores table and
     * represents a normalized percentile score between 0 and 100.
     */
    trust_score?: (number & tags.Minimum<0> & tags.Maximum<100>) | undefined;

    /**
     * Current status of the citizen account indicating availability for
     * interaction. "active" means the user can participate normally;
     * "suspended" indicates temporary restriction; "banned" indicates
     * permanent removal. This field is derived from the citizen_suspensions
     * and citizen_bans tables and reflects the most severe active status.
     */
    status: "active" | "suspended" | "banned";
  };

  /**
   * Search query parameters for global search including keywords, filters,
   * and pagination controls.
   *
   * This schema defines the request structure for the unified global search
   * operation that aggregates results from articles, comments, posts, images,
   * and files. The search parameters allow users to filter results by
   * keyword, content type, and pagination.
   *
   * All fields are optional except for the search criteria which must be
   * provided for meaningful results. The implementation supports exact
   * keyword matching across all content types and allows filtering by content
   * type for more targeted searches. Pagination settings control the number
   * of results and offset for navigation.
   *
   * Note: This schema is designed for a unified search across multiple
   * entities (articles, comments, posts, images, files) - not for searching
   * within a single entity type.
   */
  export type IRequest = {
    /**
     * Search query string for keyword matching across all content types.
     * Must contain at least one non-whitespace character.
     *
     * The query is matched against title, content, description, and file
     * name fields across all content types.
     *
     * Examples:
     *
     * - "climate change" - finds content containing both words
     * - "AI regulations" - finds content containing both terms
     * - "2024" - finds content mentioning the year
     *
     * Only non-empty strings are valid. Empty strings or whitespace-only
     * strings are rejected.
     *
     * Implementation note: This parameter is passed to a full-text search
     * engine that indexes all public content.
     */
    q: string & tags.MinLength<1>;
  };
}
