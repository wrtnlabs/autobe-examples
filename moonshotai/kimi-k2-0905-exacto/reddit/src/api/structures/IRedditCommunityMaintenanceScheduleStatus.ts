import { tags } from "typia";

export namespace IRedditCommunityMaintenanceScheduleStatus {
  /**
   * Condensed representation of maintenance activity status tracking used
   * throughout Reddit Community platform administrative interfaces for
   * operational oversight and maintenance scheduling workflows. This summary
   * captures the "status" field from the
   * reddit_community_maintenance_schedules table, which tracks the current
   * operational phase of maintenance activities including scheduled,
   * in_progress, completed, cancelled, and postponed states.
   *
   * Maintenance status classifications define the tracking states for
   * maintenance activities including scheduled events, planned outages,
   * emergency maintenance, and system recovery procedures. They enable
   * platform moderators to understand current operational status and maintain
   * platform health through systematic maintenance management across the
   * distributed Reddit Community platform infrastructure.
   *
   * The status summary provides quick reference for maintenance operational
   * phases while supporting efficient display across multiple maintenance
   * tracking interfaces throughout platform administrative systems. Critical
   * for providing operational context about maintenance progression within
   * system health monitoring, administrative dashboards, and maintenance
   * performance reporting for platform governance oversight.
   */
  export type ISummary = {
    /**
     * Unique identifier for the maintenance status record, directly
     * corresponding to the status field classification in
     * reddit_community_maintenance_schedules
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name for the maintenance activity state classification
     * (scheduled, in_progress, completed, cancelled, postponed)
     */
    name: string;

    /**
     * Brief description explaining the operational characteristics and
     * business implications of this maintenance activity status state
     */
    description?: string | undefined;
  };
}
