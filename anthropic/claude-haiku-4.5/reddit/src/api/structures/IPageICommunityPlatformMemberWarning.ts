import { IPage } from "./IPage";
import { ICommunityPlatformMemberWarning } from "./ICommunityPlatformMemberWarning";

export namespace IPageICommunityPlatformMemberWarning {
  /**
   * Paginated collection of member warning summaries for managing
   * disciplinary records.
   *
   * Provides moderators and administrators with filtered, sorted warning
   * listings for reviewing member disciplinary histories and violation
   * patterns. Supports searching and filtering by member ID, violation
   * category, warning count thresholds, and date ranges to identify repeat
   * offenders and track escalation.
   *
   * Each page contains an array of warning summaries with essential
   * disciplinary information including the warned member, violation category
   * that triggered the warning, cumulative warning count at time of issuance,
   * and whether the warning has expired (90-day expiration window).
   * Pagination enables browsing through extensive warning histories
   * efficiently. Results are sortable by creation date, violation category,
   * member ID, or warning count in ascending or descending order.
   *
   * This paginated response directly corresponds to the
   * community_platform_member_warnings table and integrates with disciplinary
   * workflows, enabling moderators to manage progressive discipline and
   * prevent repeat violations.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /**
     * List of member warning summaries for disciplinary review.
     *
     * Each item contains essential warning information for tracking member
     * violations: member identity, violation category, cumulative warning
     * count, issuance date, and expiration status. This lightweight
     * representation enables efficient display in warning histories and
     * member profiles without loading complete decision details.
     */
    data: ICommunityPlatformMemberWarning.ISummary[];
  };
}
