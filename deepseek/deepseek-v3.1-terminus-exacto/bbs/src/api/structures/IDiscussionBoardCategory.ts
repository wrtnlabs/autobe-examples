import { tags } from "typia";

export namespace IDiscussionBoardCategory {
  /**
   * Summary view of discussion board channels optimized for list displays and
   * browsing operations.
   *
   * Provides essential channel information for efficient navigation and
   * selection within the discussion board interface. This summary format
   * includes only the most critical fields needed for channel identification
   * and basic status assessment.
   *
   * The schema maintains a direct relationship with the
   * discussion_board_channels Prisma model, ensuring data consistency and
   * accurate representation of channel entities across the application.
   */
  export type ISummary = {
    /**
     * Unique identifier for the discussion board channel. Automatically
     * generated UUID v4 that serves as the primary key for channel
     * operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Channel name that identifies the discussion category (e.g.,
     * 'Economics', 'Politics'). Used for content categorization and user
     * navigation.
     */
    name: string;

    /**
     * Detailed description explaining the channel's purpose and discussion
     * scope. Helps users understand the channel's focus before
     * participating.
     */
    description: string;

    /**
     * Channel status indicating whether it is active, inactive, or
     * archived. Controls content visibility and user access to the
     * channel.
     */
    status: string;

    /**
     * Timestamp when the channel was created. Useful for chronological
     * sorting and activity analysis.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
