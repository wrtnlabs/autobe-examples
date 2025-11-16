export namespace IRedditCommunityMaintenanceSchedulePriority {
  /**
   * Condensed representation of maintenance priority classification system
   * used throughout Reddit Community platform administrative interfaces for
   * maintenance scheduling and resource allocation workflows. This summary
   * represents priority levels from the
   * reddit_community_maintenance_schedules table including low, medium, high,
   * and critical classifications that determine maintenance scheduling
   * precedence and resource allocation.
   *
   * Maintenance priority levels define the operational urgency and scheduling
   * constraints for platform maintenance activities, enabling administrators
   * to allocate resources appropriately and coordinate timing across
   * different maintenance types. The priority classification system ensures
   * that critical system updates receive immediate attention while routine
   * maintenance can be scheduled flexibly around user activity patterns.
   *
   * The priority summary provides essential information for schedule planning
   * while supporting operational oversight across maintenance management
   * interfaces throughout the Reddit Community platform infrastructure.
   * Critical for facilitating efficient maintenance coordination within the
   * platform's distributed architecture while maintaining service
   * availability and minimizing user impact during scheduled maintenance
   * activities.
   */
  export type ISummary = {
    /**
     * Maintenance priority classification level (low, medium, high,
     * critical) from reddit_community_maintenance_schedules table
     */
    priority: string;

    /**
     * Standardized description explaining resource allocation and
     * scheduling constraints for this priority level
     */
    description: string;
  };
}
