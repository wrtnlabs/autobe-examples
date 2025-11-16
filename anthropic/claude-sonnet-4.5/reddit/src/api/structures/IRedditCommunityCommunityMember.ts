import { tags } from "typia";

export namespace IRedditCommunityCommunityMember {
  /**
   * Summary representation of a community member optimized for references and
   * list displays.
   *
   * Provides essential identifying information about a registered member in a
   * lightweight format suitable for embedding in other entities (such as
   * posts, comments, ban records, or appeals) or displaying in member lists.
   * Excludes detailed profile information, karma scores, and account settings
   * to minimize payload size.
   *
   * Used when member context is needed but full profile details are not
   * required, such as in content authorship, moderation records, or activity
   * feeds.
   */
  export type ISummary = {
    /**
     * Unique identifier for the community member.
     *
     * Primary key for the member record, used in database relationships and
     * API operations requiring member identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique username chosen by the member during registration.
     *
     * Publicly visible identifier used throughout the platform to identify
     * this member. Must be unique across all members. Displayed on all
     * content created by this member and in member references.
     */
    username: string;
  };
}
