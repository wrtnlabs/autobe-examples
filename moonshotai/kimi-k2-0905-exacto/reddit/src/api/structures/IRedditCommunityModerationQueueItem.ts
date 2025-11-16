import { tags } from "typia";

import { IRedditCommunityModerator } from "./IRedditCommunityModerator";
import { IRedditCommunityContentReport } from "./IRedditCommunityContentReport";

export namespace IRedditCommunityModerationQueueItem {
  /**
   * Comprehensive summary view of items in the moderator review queue for
   * processing reported content throughout community moderation workflows.
   *
   * The moderation queue serves as the central intake system for all content
   * reports requiring moderator attention within Reddit-style community
   * standards enforcement. Reports are prioritized based on violation
   * severity while moderators are assigned based on expertise areas, workload
   * balancing algorithms, and community-specific availability
   * considerations.
   *
   * This summary view provides essential queue management information
   * including temporal tracking, assignment history, and content
   * classification while excluding internal processing notes and assignment
   * details. Suitable for queue dashboards, workload monitoring, and
   * coordination among distributed moderation teams across platform
   * communities.
   */
  export type ISummary = {
    /**
     * Timestamp when report was assigned to a moderator. Records when
     * moderator review responsibility was established.
     *
     * Enables comprehensive assignment tracking and response time analytics
     * for moderation team performance assessment. This timestamp drives
     * escalation algorithms that redistribute workload when reviews exceed
     * community-specific service level agreements while maintaining
     * accountability for individual moderator decisions and review quality
     * across distributed moderation teams.
     */
    assigned_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Community or platform moderator currently assigned to this review.
     * Tracks responsibility and workload distribution among moderation
     * teams.
     *
     * Functions as the core assignment reference enabling workload
     * balancing algorithms that optimize moderator capacity across
     * community-specific moderation loads while maintaining accountability
     * for review decisions. This reference drives automated escalation
     * systems that redistribute reviews based on moderator availability,
     * expertise areas, and community-specific service level requirements
     * throughout complex distributed moderation environments.
     */
    assignee?: IRedditCommunityModerator.ISummary | null | undefined;

    /**
     * Report being processed in this queue entry. Reference to the
     * user-generated report that triggered the moderation workflow.
     *
     * Serves as the primary data source for assignment decisions, priority
     * calculations, and reviewer expertise matching throughout the
     * moderation workflow. This reference enables efficient queue
     * optimization algorithms while providing essential context for
     * moderator decision-making and community governance standards
     * enforcement across the distributed review system.
     */
    content_report?: IRedditCommunityContentReport.ISummary | undefined;

    /**
     * Timestamp when queue item was created. Foundation timestamp for queue
     * position tracking and aging calculations.
     *
     * This temporal marker enables sophisticated queue ordering algorithms
     * that balance urgency with fairness while supporting comprehensive
     * audit trails for community governance reporting. It provides the
     * chronological foundation for complex workflow management systems that
     * optimize resource allocation across multiple concurrent moderation
     * streams and escalation pathways throughout platform operations.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Deadline for completing review based on community policies. Sets
     * expectations for timely resolution based on priority level.
     *
     * Functions as the primary SLA enforcement mechanism ensuring community
     * standards are reviewed within appropriate timeframes based on
     * violation severity and community-established service level
     * agreements. This metric drives automated escalation workflows and
     * priority redistribution algorithms that maintain platform quality
     * assurance while managing moderator capacity across expanding
     * community participation rates.
     */
    due_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Unique identifier for the queue item. Primary key for tracking
     * individual moderation cases.
     *
     * Functions as the immutable reference for this specific moderation
     * workflow instance across all system operations. Enables efficient
     * linking between queue management, assignment tracking, and audit
     * trail systems while maintaining referential integrity throughout the
     * moderation lifecycle.
     *
     * The UUID serves as the primary index for queue optimization
     * algorithms and supports distributed moderation across multiple
     * moderator teams and geographic regions within the platform
     * architecture.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Processing priority: critical, high, medium, or low based on
     * violation severity. Determines urgency of moderator attention
     * required.
     *
     * This priority classification drives dynamic queue ordering algorithms
     * that optimize response times for high-impact violations while
     * ensuring fair processing distribution across all severity levels. It
     * influences assignment routing to specialized moderator expertise
     * areas and escalates to platform teams when community-specific issues
     * require elevated attention levels within the moderation workflow
     * system.
     */
    priority: string;

    /**
     * Ordinal position in queue for FIFO processing. Determines automated
     * review ordering in priority-balanced sequences.
     *
     * Supports intelligent queue ordering algorithms that balance fairness
     * principles with urgency requirements across diverse violation types
     * and community impact levels. This positioning system enables
     * transparent queue management while supporting complex multi-factor
     * priority calculations that optimize response times across concurrent
     * moderation workflows.
     */
    queue_position?:
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | undefined;

    /**
     * Queue status: pending, assigned, in_review, reviewed, or escalated.
     * Tracks workflow progression through the moderation process.
     *
     * The status field controls operational dashboard metrics, moderator
     * workload balancing algorithms, and automated SLA tracking systems. It
     * enables precise coordination between human review processes and
     * automated content filtering while maintaining audit trails for
     * compliance monitoring and community governance reporting throughout
     * the moderation ecosystem.
     */
    status: string;

    /**
     * Timestamp of last queue item update. Tracks state transitions and
     * modification history for audit purposes.
     *
     * Supports comprehensive review tracking algorithms that monitor
     * processing times and identify bottlenecks within complex moderation
     * workflows. This timestamp enables precise performance measurement
     * across multiple review stages while maintaining accountability for
     * processing delays and ensuring quality assurance standards throughout
     * distributed community moderation systems.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
