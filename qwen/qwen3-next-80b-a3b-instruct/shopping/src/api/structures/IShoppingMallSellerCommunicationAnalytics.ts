import { tags } from "typia";

import { ICommunicationVolumeByChannel } from "./ICommunicationVolumeByChannel";
import { ICommunicationChannelDistribution } from "./ICommunicationChannelDistribution";
import { ITopPerformingSeller } from "./ITopPerformingSeller";
import { IMostActiveCategory } from "./IMostActiveCategory";
import { IResponseTimeDistribution } from "./IResponseTimeDistribution";
import { ICommunicationLatencyPercentile } from "./ICommunicationLatencyPercentile";

export namespace IShoppingMallSellerCommunicationAnalytics {
  /**
   * Summary metrics and analytics for seller communication patterns including
   * volume, response efficiency, and performance benchmarks.
   *
   * This schema represents aggregated analytics data for seller-customer
   * communication patterns across the platform.
   *
   * Key metrics include: total communication volume, average response time,
   * communication channel distribution, response rate by seller, and
   * communication volume by date range. This information helps identify
   * sellers with high engagement, those needing support in responsiveness,
   * and overall platform communication health.
   *
   * The data is computed on demand from communication logs and represents the
   * most recent available analytics (current day and previous 30 days).
   *
   * This schema does not expose individual communication records but presents
   * aggregated metrics optimized for analytics dashboards. It ensures data
   * privacy while providing actionable insights for administrator oversight.
   */
  export type ISummary = {
    /**
     * Total number of communication events recorded across all sellers
     * during the analyzed period (last 30 days).
     *
     * This metric aggregates all logged interactions between sellers and
     * customers through platform channels including in-app messaging, email
     * notifications, and support tickets. The count reflects the total
     * volume of communication activity, helping administrators gauge
     * overall seller engagement levels and identify potential workload
     * concerns.
     *
     * Data is sourced from the shopping_mall_seller_communication_logs
     * table and includes every recorded interaction event. This metric is
     * used to identify sellers who are highly engaged versus those who are
     * not responding consistently.
     *
     * An anomaly detection trigger can be set at a threshold of 100+
     * communications per seller per day, indicating potential spamming
     * behavior or operational overload.
     */
    totalCommunications: number & tags.Type<"int32">;

    /**
     * Average time in hours between a customer message and a seller
     * response, calculated across all messages with responses during the
     * analyzed period (last 30 days).
     *
     * This key performance indicator measures seller responsiveness,
     * directly impacting customer satisfaction and conversion rates. Only
     * messages with a response are included in this calculation, excluding
     * messages with no reply.
     *
     * The metric excludes weekends and off-hours when seller responses may
     * be delayed. Values are calculated from response timestamp minus
     * message timestamp, converted to hours.
     *
     * A value below 4 hours indicates excellent responsiveness, between
     * 4-24 hours is acceptable, and values above 24 hours are flagged for
     * remediation. Repeated high values trigger automated seller support
     * interventions.
     */
    averageResponseTimeHours: number;

    /**
     * Percentage of customer messages that received a seller response
     * within 24 hours during the analyzed period (last 30 days). This
     * metric measures seller responsiveness efficiency and directly
     * correlates with customer satisfaction scores.
     *
     * The calculation is: (Number of messages responded to within 24 hours
     * / Total number of messages received) * 100.
     *
     * Only messages that received a reply are counted in the denominator,
     * as unanswered messages indicate a seller who is unresponsive.
     *
     * Target threshold is 85%: sellers below this threshold are flagged for
     * training, and sellers below 70% are subject to performance probation.
     * Values are rounded to two decimal places for display accuracy.
     */
    responseRatePercent: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * A normalized score (0-1) representing the variety of communication
     * channels used by sellers for customer interactions.
     *
     * This score indicates whether sellers are leveraging multiple
     * communication channels effectively or relying predominantly on one
     * channel.
     *
     * Calculated by: 1 - (Standard deviation of channel usage frequencies /
     * Mean channel usage frequency).
     *
     * A score near 1 indicates high diversity (using in-app, email, phone,
     * etc.), while scores near 0 indicate over-reliance on a single
     * channel.
     *
     * Increased diversity improves customer reach and reduces bottlenecks;
     * a score below 0.3 may indicate poor channel implementation that could
     * limit customer access.
     *
     * This metric is used to identify sellers who may benefit from channel
     * training.
     */
    communicationDiversityScore: number & tags.Minimum<0> & tags.Maximum<1>;

    /**
     * A composite score (0-100) representing overall seller engagement,
     * combining response rate, average response time, communication volume,
     * and communication diversity.
     *
     * This index provides a single standardized metric for ranking seller
     * engagement levels across the platform.
     *
     * Calculation formula: (0.4 * normalizedResponseRate) + (0.3 *
     * normalizedResponseTime) + (0.2 * normalizedVolume) + (0.1 *
     * normalizedDiversity)
     *
     * Where each component is normalized to 0-1 based on platform-wide
     * quartiles.
     *
     * Scores above 80 indicate exceptionally active sellers, 60-80 indicate
     * above average, 40-60 average, 20-40 below average, and below 20
     * indicate highly inactive sellers requiring intervention.
     */
    sellerEngagementIndex: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * Number of sellers classified as high engagement based on the
     * sellerEngagementIndex threshold of 80+.
     *
     * These sellers represent the top 15% of performers in terms of
     * communication engagement and are prioritized for platform
     * recognition, featured placement, and premium support.
     *
     * This count allows administrators to quickly identify the size of
     * high-performing seller cohort and track trends over time.
     *
     * It is a key metric for measuring platform health and seller success
     * rate.
     */
    highEngagementSellersCount: number & tags.Type<"int32">;

    /**
     * Number of sellers identified as having consistently poor response
     * times (below 24-hour threshold for 85%+ of messages) during the
     * analyzed period.
     *
     * These sellers represent approximately 10% of the seller base and are
     * flagged for automated intervention including training resources,
     * direct support contact, and temporary feature restrictions.
     *
     * Persistent low response rates lead to declined customer satisfaction
     * and increased support ticket volume, directly impacting platform
     * reputation.
     *
     * This metric triggers seller performance alerts and compliance
     * reviews.
     */
    lowResponseSellersCount: number & tags.Type<"int32">;

    /**
     * Distribution of communication volume across different communication
     * channels.
     *
     * This property contains key-value pairs where keys represent channel
     * types (e.g., 'in_app', 'email', 'phone', 'support_ticket') and values
     * represent the count of communications through that channel during the
     * analyzed period.
     *
     * Used to identify which channels are most popular among sellers and
     * customers. For example, if in-app messaging represents 80% of
     * communications, the platform may prioritize mobile app enhancements.
     *
     * Note: Entry with zero count is valid (indicates channel not used).
     *
     * This distribution helps determine resource allocation for channel
     * maintenance and optimization.
     */
    communicationVolumeByChannel: ICommunicationVolumeByChannel;

    /**
     * Daily communication volume trend data for the last 30 days.
     *
     * Each item represents communication volume for a specific day. Array
     * is ordered chronologically with index 0 representing the oldest day
     * (30 days ago) and the last index (index 29) representing the most
     * recent day.
     *
     * Used to detect daily volatility, week-over-week trends, and patterns
     * such as weekend dips. Data points are aggregated from the
     * shopping_mall_seller_communication_logs table with timestamp
     * truncated to day level.
     *
     * Assumes UTC timezone for consistency across global seller base.
     *
     * This trend pattern helps identify day-of-week impact on communication
     * volume and predicts future demand for support staffing.
     */
    communicationVolumeByDay: (number &
      tags.Type<"int32"> &
      tags.Minimum<0>)[] &
      tags.MinItems<30> &
      tags.MaxItems<30>;

    /**
     * Percentage distribution of communication types across all channels.
     *
     * This property contains key-value pairs where keys represent channel
     * types (e.g., 'in_app', 'email', 'phone') and values represent the
     * percentage of total communications using that channel.
     *
     * All percentages must sum to exactly 100%.
     *
     * Used to determine channel adoption rates and identify shifts in
     * customer communication preferences. Helps guide platform investment
     * in channel infrastructure.
     *
     * For example, if email communication increases from 20% to 40% over a
     * quarter, it may signal a trend toward formal communication requiring
     * better email automation tools.
     */
    communicationChannelDistribution: ICommunicationChannelDistribution;

    /**
     * List of the top 5 sellers with the highest sellerEngagementIndex
     * during the analyzed period.
     *
     * Each entry contains seller_id and sellerEngagementIndex value.
     * Sellers are ranked in descending order of engagement score, with the
     * highest-scoring seller at index 0.
     *
     * Used for platform recognition programs and vendor spotlight features.
     * Only sellers with active status are included in this list.
     *
     * This data enables targeted incentive programs and helps promote best
     * practices across the platform.
     */
    topPerformingSellers: ITopPerformingSeller[] &
      tags.MinItems<5> &
      tags.MaxItems<5>;

    /**
     * List of the top 5 product categories with the highest communication
     * volume during the analyzed period.
     *
     * Each entry contains category_id and total_communication_count.
     * Categories are ranked in descending order of communication volume.
     *
     * Used to identify which product categories are generating the most
     * customer inquiry and support demand. Helps prioritize
     * category-specific support training and product documentation.
     *
     * Focuses on categories where customer education or product explanation
     * may be inadequate.
     */
    mostActiveCategories: IMostActiveCategory[] &
      tags.MinItems<5> &
      tags.MaxItems<5>;

    /**
     * Analyzes percentage growth or decline in communication volume
     * compared to previous period.
     *
     * This property indicates whether communication volume is increasing,
     * decreasing, or remaining stable based on week-over-week comparison.
     *
     * Trend classification:
     *
     * - "increasing": >10% growth from previous 7-day period
     * - "decreasing": >10% decline from previous 7-day period
     * - "stable": within ±10% of previous period
     *
     * Used for early detection of platform-wide trends, such as increased
     * seller activity from new marketing campaigns or decreased engagement
     * following policy changes.
     */
    communicationGrowthTrend: "increasing" | "decreasing" | "stable";

    /**
     * Distribution of response times grouped into time buckets to
     * understand response time patterns.
     *
     * This property groups response times into standard buckets to identify
     * where delays most commonly occur:
     *
     * - "<1 hour": Immediate response
     * - "1-4 hours": Responsive
     * - "4-24 hours": Acceptable
     * - "1-3 days": Delayed
     * - ">3 days": Very delayed
     *
     * Each bucket contains the count and percentage of responses falling
     * into that range.
     *
     * Identifies systemic delays and informs automation opportunities
     * (e.g., auto-replies for responses >24 hours). Helps sellers identify
     * their own response patterns and improve.
     */
    responseTimeDistribution: IResponseTimeDistribution;

    /**
     * Statistical percentiles for response time distribution to understand
     * latency patterns.
     *
     * This property provides key performance indicators for response time
     * variability:
     *
     * - "p50": Median response time
     * - "p75": 75th percentile response time
     * - "p90": 90th percentile response time
     * - "p95": 95th percentile response time
     *
     * Represents typical and worst-case performance. For example, p95 value
     * of 48 hours indicates that 5% of responses take 2 full days or more.
     *
     * High p90/p95 values relative to p50 indicate inconsistent server
     * performance or seller behavior.
     *
     * Used for SLA reporting and identifying outliers in seller behavior.
     */
    communicationLatencyPercentile: ICommunicationLatencyPercentile;

    /**
     * Customer satisfaction score derived from post-communication surveys,
     * averaged across all completed communications.
     *
     * Score range is 0-10, with 10 being highest satisfaction.
     *
     * Calculated from a two-question survey sent after communication
     * completion:
     *
     * 1. How satisfied were you with the response? (1-5 scale)
     * 2. How likely are you to recommend this seller? (1-5 scale)
     *
     * Final score = (Q1 + Q2) * 1
     *
     * Only surveys with responses are included. Averages are rounded to one
     * decimal place.
     *
     * Scores below 6 trigger automated feedback collection requests for
     * improvement, and scores below 4 trigger seller coaching alerts.
     */
    satisfactionScore: number & tags.Minimum<0> & tags.Maximum<10>;

    /**
     * Percentage of communications that resulted in a resolved issue or
     * completed transaction.
     *
     * Calculated as: (Number of communications with resolution status
     * 'completed' or 'solved' / Total number of communications) * 100.
     *
     * A "resolved" communication is one where:
     *
     * - Customer issued a purchase within 7 days of communication
     * - Issue was explicitly marked as resolved by seller
     * - Follow-up communication confirmed problem solved
     *
     * Impacts customer retention and platform trust metrics. This differs
     * from response rate by measuring effectiveness, not just activity.
     *
     * Goal target is 80%. Values below this threshold indicate that
     * communication is occurring but not converting to outcomes.
     */
    communicationResolutionRate: number & tags.Minimum<0> & tags.Maximum<100>;
  };
}
