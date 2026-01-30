import { tags } from "typia";

export namespace ICommunityBbsCommunityMetrics {
  /**
   * Summary representation of community metrics used for analytics,
   * discovery, and trending features. Contains essential performance
   * indicators for communities including active subscriber count, 7-day
   * growth rate, engagement rate (posts and comments per subscriber), content
   * quality score (average karma of community content), and trending score
   * (combining recent engagement and popularity). This compressed
   * representation is optimized for displaying community rankings and
   * discovery recommendations.
   */
  export type ISummary = {
    /**
     * Current number of active subscribers in the community, representing
     * users who have engaged with content in the last 30 days.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_metrics.active_subscribers column.
     */
    active_subscribers: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Percentage growth in active subscribers over the past 7 days,
     * calculated using the formula: (current_subscribers -
     * subscribers_7_days_ago) / subscribers_7_days_ago * 100.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_metrics.growth_rate_7d column.
     */
    growth_rate_7d: number & tags.Minimum<-100> & tags.Maximum<1000>;

    /**
     * Average number of posts and comments per subscriber per week,
     * calculated by dividing total weekly interactions by active subscriber
     * count. Measures community activity intensity.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_metrics.engagement_rate column.
     */
    engagement_rate: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * Average karma score of all posts and comments in the community,
     * representing the overall content quality as perceived by the user
     * community.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_metrics.content_quality_score column.
     */
    content_quality_score: number & tags.Minimum<0> & tags.Maximum<10>;

    /**
     * Composite score combining recent engagement and popularity,
     * calculated using a weighted formula of: (0.6 * content_quality_score)
     * + (0.3 * growth_rate_7d) + (0.1 * engagement_rate). Used for ranking
     * communities in discovery feeds.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_metrics.trending_score column.
     */
    trending_score: number & tags.Minimum<0> & tags.Maximum<100>;
  };
}
