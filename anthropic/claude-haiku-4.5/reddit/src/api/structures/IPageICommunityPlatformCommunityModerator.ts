import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModerator } from "./ICommunityPlatformCommunityModerator";

export namespace IPageICommunityPlatformCommunityModerator {
  /**
   * Paginated collection of community moderators matching search criteria.
   *
   * Wraps an array of moderator assignment summaries with pagination
   * metadata. Each moderator record includes tier level (creator, senior,
   * junior) determining authority scope, appointment timestamp used for
   * seniority hierarchy, and active status indicating whether the moderator
   * is currently serving the community.
   *
   * This response type is used by the moderator listing endpoint to return
   * filtered and sorted moderator rosters for communities, supporting
   * community management workflows and moderator team visibility. The
   * pagination structure enables efficient browsing of moderator assignments
   * in communities with many moderators.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /**
     * List of moderator assignment records with tier level, appointment
     * date, and activity status. Each record includes the moderator's tier
     * (creator, senior, junior), appointment timestamp for determining
     * seniority, and whether they are currently active. Embedded community
     * and member summaries provide context for the moderator assignment.
     */
    data: ICommunityPlatformCommunityModerator.ISummary[];
  };
}
