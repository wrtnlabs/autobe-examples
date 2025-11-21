export namespace ICommunityBBSReportTrend {
  /**
   * Summary representation of a report trend for monitoring community health
   * and moderation effectiveness.
   *
   * Report trends provide key indicators about community moderation patterns,
   * user behavior changes, and system performance over time. The summary
   * includes aggregated metrics that help administrators understand whether
   * moderation efforts are effective, whether new types of abuse are
   * emerging, or whether community guidelines need refinement.
   *
   * This type is used in analytics dashboards, period reports to community
   * owners, and proactive moderation planning.
   *
   * The summary contains only mathematical aggregates and categorical
   * breakdowns, excluding any data that could identify individuals, posts, or
   * comments. It is designed to be privacy-safe and compliant with data
   * protection regulations.
   *
   * Examples of trend metrics: 'Weekly increase in report volume by 18%',
   * '62% of reports are for spam content', '97% of reports on comments were
   * approved'.
   */
  export type ISummary = string;
}
