import { tags } from "typia";

export namespace IEconomicDiscussionMembers {
  /**
   * Lightweight member summary representation for listing and cross-reference
   * purposes in the economic discussion platform.
   *
   * This condensed view provides essential member information needed for
   * article attribution, comment authorship, and user discovery interfaces.
   * It excludes sensitive data like password hashes and detailed session
   * information while focusing on publicly visible and administrative
   * identifiers.
   *
   * The summary format is optimized for API responses that need to display
   * user information across multiple contexts while maintaining performance
   * and security boundaries.
   */
  export type ISummary = {
    /** Primary key identifier for the member */
    id: string & tags.Format<"uuid">;

    /** Unique member display name chosen during registration */
    username: string & tags.MinLength<3> & tags.MaxLength<30>;

    /** Email verification status for account credibility indication */
    email_verified: boolean;

    /** Community participation score for member credibility and ranking */
    reputation_score: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Account registration timestamp for member age indication */
    created_at: string & tags.Format<"date-time">;
  };
}
