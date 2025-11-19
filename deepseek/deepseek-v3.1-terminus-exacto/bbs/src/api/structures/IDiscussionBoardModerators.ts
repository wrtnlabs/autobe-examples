import { tags } from "typia";

export namespace IDiscussionBoardModerators {
  /**
   * Summary view of a moderator for queue assignment context.
   *
   * Provides essential information about a moderator including contact
   * information and display name for user-facing identification. Used for
   * displaying moderator assignment information within moderation queue
   * entries.
   *
   * This enhanced summary includes email for contact purposes and display
   * name for better user experience. The role level provides permission
   * context while active status ensures only active moderators are assigned
   * to moderation tasks.
   */
  export type ISummary = {
    /** Primary key identifier for the moderator. */
    id: string & tags.Format<"uuid">;

    /** Moderator's username for identification. */
    username: string;

    /** Moderator's email address for contact purposes. */
    email: string & tags.Format<"email">;

    /** Moderator's display name for user-facing identification. */
    display_name: string;

    /** Moderator role level (e.g., 'junior', 'senior', 'admin'). */
    role: string;

    /** Indicates if the moderator account is currently active. */
    is_active: boolean;
  };
}
