import { tags } from "typia";

export namespace IPoliticsBbsArticleCreator {
  /**
   * Summary information about the creator of a politics discussion board
   * article. This DTO provides essential creator profile information for
   * review and moderation contexts, enabling quick assessment of content
   * authenticity and community standing.
   *
   * This summary focuses on identity verification basics rather than detailed
   * profile information, making it suitable for queue displays and quick
   * moderation decisions where creator reputation and verification status
   * matter more than extensive profile data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the article creator. Essential for linking
     * articles to their creators across all review and moderation
     * processes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name or username of the content creator. Used for
     * attribution in review contexts and serves as the visible identifier
     * for moderation teams.
     */
    username: string;

    /**
     * Type of account holder: member or moderator. Essential for
     * understanding creator privileges and context during review
     * processes.
     */
    account_type: string;

    /**
     * Timestamp when the creator's account was established. Useful for
     * identifying new vs established users and potential reputation factors
     * in review.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
