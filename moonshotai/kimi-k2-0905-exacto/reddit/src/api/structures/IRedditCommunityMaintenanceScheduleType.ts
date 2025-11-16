import { tags } from "typia";

export namespace IRedditCommunityMaintenanceScheduleType {
  /**
   * Lightweight summary representation of maintenance type classifications
   * used throughout Reddit Community platform infrastructure. This summary
   * captures essential maintenance category information for efficient display
   * in operational dashboards, system monitoring interfaces, and maintenance
   * schedule management workflows.
   *
   * Maintenance types define the operational categories that coordinate
   * platform-wide maintenance activities including system updates, server
   * maintenance, and scheduled downtime events. They provide standardized
   * classification for internal operations, compliance tracking, and
   * maintenance performance analytics shown to platform moderators and
   * administrative users.
   *
   * The summary includes core classification metadata while maintaining
   * responsive API performance across bulk maintenance operations and
   * distributed system monitoring scenarios.
   *
   * Essential for providing context about maintenance origins within
   * maintenance schedules, incident tracking, and operational reporting
   * throughout the Reddit Community platform infrastructure.
   */
  export type ISummary = {
    /** Unique identifier for the maintenance type classification record */
    id: string & tags.Format<"uuid">;

    /** Display name for the maintenance activity classification */
    name: string;

    /**
     * Brief description explaining the purpose and characteristics of this
     * maintenance activity type
     */
    description?: string | undefined;
  };
}
