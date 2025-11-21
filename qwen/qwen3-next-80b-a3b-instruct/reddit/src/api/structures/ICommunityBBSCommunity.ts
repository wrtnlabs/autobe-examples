export namespace ICommunityBBSCommunity {
  /**
   * Lightweight summary representation of a communityBBS community for use in
   * lists and embeddings.
   *
   * Represents a compact view of a community for display in lists, search
   * results, and references.
   *
   * Contains essential information needed for user interaction with
   * communities without the full detail.
   *
   * Used in pagination responses (IPageICommunityBBSCommunity.ISummary) for
   * listing multiple communities.
   *
   * Excludes large text fields, nested relationships, and detailed analytics
   * to optimize for performance.
   *
   * Based on community_bbs_communities Prisma model with only essential
   * summary fields.
   */
  export type ISummary = string;
}
