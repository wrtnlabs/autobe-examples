import { tags } from "typia";

export namespace IDiscussionBoardArticleMonthlyStats {
  /**
   * Summary statistics representing aggregated monthly analytics for
   * discussion board articles. The DTO provides numerical metrics for trend
   * analysis without revealing individual article details or user
   * information. Designed specifically for dashboard widgets and business
   * intelligence applications, this summary focuses on volume, content
   * metrics, and engagement trends.
   *
   * Monthly analytics statistics are calculated from the
   * discussion_board_articles table by grouping records by calendar month.
   * The metrics provide business teams with immediate insights into
   * publishing patterns, content complexity, and user interaction trends.
   * This DTO exclusively offers aggregated, anonymized data that complies
   * with platform privacy policies, making it safe for public consumption and
   * dashboard integrations.
   *
   * The design adheres to the Summary DTO pattern by including only essential
   * fields for list-style displays. Unlike full Article DTOs that include
   * textual content and author references, this summary is optimized for
   * performance with light weight (5-15KB per month) and direct integration
   * with analytics libraries.
   */
  export type ISummary = {
    /**
     * Calendar month identifier in ISO 8601 format (YYYY-MM). Serves as the
     * unique grouping key for analytics data. This field follows the
     * standard ISO format where '2024-05' represents May 2024. Monthly
     * grouping enables pattern analysis across quarters and years for
     * publication trends.
     *
     * The value comes from the SQL GROUP BY clause that extracts month from
     * the article creation timestamp. Valid values follow the pattern
     * ^\d{4-(0[1-9]|1[0-2])$, ensuring consistent date handling across
     * systems. This format is required for compatibility with analytics
     * dashboard filters and time-series analysis tools.
     */
    month: string & tags.Pattern<"^\\d{4-(0[1-9]|1[0-2])$">;

    /**
     * Total number of articles published during the specified month.
     * Represents the count of articles that were created within the month,
     * used to measure publication volume trends.
     *
     * This metric requires careful calculation: it should include articles
     * published on any day within the month, excluding drafts and deleted
     * articles. The count directly impacts metrics like growth rate
     * calculations, making it a critical field for business
     * decision-making. Valid values are non-negative integers from 0
     * upwards.
     */
    articleCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average word count across all published articles in the specified
     * month. Calculated by dividing total word count by articleCount.
     * Measures content complexity and production effort across the month.
     *
     * This metric is used for tracking content evolution and quality trends
     * without requiring manual content analysis. Lower values may indicate
     * brief, tactical content, while higher values suggest in-depth
     * discussions. The calculation excludes draft articles and only
     * considers completed publications. Valid values are positive numbers
     * starting from 0.
     */
    averageWordCount: number & tags.Minimum<0>;

    /**
     * Composite engagement metric reflecting overall article interaction
     * for the month. Aggregates metrics like comments, likes, shares, and
     * views into a normalized score between 0-100.
     *
     * This score is calculated using platform-specific weighting algorithms
     * that prevent outlier impact. A higher score indicates stronger
     * content resonance and user interest. The value enables quick trend
     * spotting without requiring detailed analysis of individual engagement
     * sources. Valid values are numbers between 0 and 100 inclusive, with
     * decimals allowed for precise measurement.
     */
    engagementScore: number & tags.Minimum<0> & tags.Maximum<100>;
  };
}
