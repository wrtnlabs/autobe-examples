import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformReport } from "../../../../../structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "../../../../../structures/IPageICommunityPlatformReport";

export * as reviews from "./reviews/index";

/**
 * Retrieve a filtered and paginated list of moderation reports for a specific community review queue.
 *
 * This operation exposes the community-scoped report review list described by the moderation requirements. It is intended for moderators who need to browse reports awaiting review within the boundaries of a single community. The underlying report records come from the `community_platform_reports` table, which stores the reporting member, the community scope, the reporter-provided reason text, optional detail narrative, and the current workflow status and resolution state. The operation keeps report handling isolated to the requested community so that moderation work in one community never appears in another community's review context.
 *
 * Access to this operation is restricted to authenticated members who currently hold moderator standing for the target community through `community_platform_community_moderators`. The moderation assignment is community-specific and includes role and lifecycle status, so the implementation must confirm that the caller's assignment for the requested `community_platform_communities.id` is active before returning any data. If the caller is not a moderator for that community, the request must be denied. This behavior directly supports the requirements that only moderators may open a report review list and that moderators may not review reports for different communities.
 *
 * The report list is community-bound by design. Each `community_platform_reports` row belongs to one `community_platform_communities` record, and the reported target is normalized into either `community_platform_report_posts` or `community_platform_report_comments`. When a report concerns a post, the target content is resolved through `community_platform_posts`. When a report concerns a comment, the target content is resolved through `community_platform_comments`, which in turn belongs to a post inside the same community context. The response should therefore present report summaries enriched with enough target information to let moderators understand what was reported, who submitted the report, and why it was submitted, consistent with the requirement that moderators see the reported content, reporter identity, and reason text.
 *
 * Because this is a list-browsing operation, the request body supports pagination, sorting, and filtering over report workflow fields such as status, creation timing, and text-based search over reason or detail where supported by the schema. The implementation should default to practical moderation ordering, such as newest open items first, while still allowing explicit client-directed sort options defined by the request DTO. Reports tied to unavailable communities must not be presented as normal active moderation items. If the requested community no longer exists or is no longer available for active moderation context, the operation must not return a normal review queue for it.
 *
 * This operation is commonly used before a moderator opens a specific report detail or performs a separate review action that records an entry in `community_platform_report_reviews`. It supplies the queue-level view only and does not itself create, update, or resolve reports. Clients should call this operation first to obtain the relevant community-specific report set, then use a dedicated detail or review endpoint to inspect and process an individual report.
 *
 * @param props.connection
 * @param props.communityId Target community ID for the moderation report review list
 * @param props.body Filtering, sorting, and pagination criteria for the community report review list
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Validate that the caller is an authenticated member
 *   and resolve the requested `communityId` against
 *   `community_platform_communities.id`.
 *
 * Authorize by querying `community_platform_community_moderators` for a row matching the requested community and the caller's member identity, and require an active moderation assignment that has not been revoked or deleted. If no qualifying assignment exists, reject the request as forbidden.
 *
 * Confirm that the requested community is available for normal moderation review. If the community does not exist, has been deleted, or otherwise cannot serve as an active community moderation context, do not return a normal report list.
 *
 * Build a list query from `community_platform_reports` constrained by `community_platform_community_id = {communityId}`. Apply request-body filters such as report status, resolution, created-at range, and text search on `reason` and `detail` only if those fields are defined by `ICommunityPlatformReport.IRequest`. Use indexed ordering based on the moderation queue use case, typically by newest `created_at` first unless overridden by validated sort options.
 *
 * Join or project related data needed for report summaries. Include reporter identity from the related member/profile projection used by the DTO layer. Resolve reported content target through `community_platform_report_posts` plus `community_platform_posts` for post reports, or through `community_platform_report_comments` plus `community_platform_comments` and the parent post for comment reports. Ensure that only content belonging to the same community context is included in the result projection.
 *
 * Return a paginated result as `IPageICommunityPlatformReport.ISummary`. Each summary should expose queue-level fields appropriate for moderation browsing, including report identity, current workflow status, reporter-facing reason information, timestamps, and a concise representation of the reported content target. Do not mutate report state in this operation. Review actions and decision history in `community_platform_report_reviews` belong to separate endpoints.
 *
 * Handle edge cases explicitly: deny non-moderators, deny moderators from other communities, exclude cross-community leakage, and avoid presenting reports tied to unavailable community context as ordinary active review items.
 * @path /communityPlatform/member/communities/:communityId/reports
 * @accessor api.functional.communityPlatform.member.communities.reports.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target community ID for the moderation report review list
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Filtering, sorting, and pagination criteria for the community report review list
     */
    body: ICommunityPlatformReport.IRequest;
  };
  export type Body = ICommunityPlatformReport.IRequest;
  export type Response = IPageICommunityPlatformReport.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/communities/:communityId/reports",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/reports`;
  export const random = (): IPageICommunityPlatformReport.ISummary =>
    typia.random<IPageICommunityPlatformReport.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single moderation report within the context of a specific community.
 *
 * This operation provides the detailed moderator review view for one report recorded in the community-scoped governance system. The underlying report record comes from the community_platform_reports table, which stores the reporting member, the community scope, the member-provided reason, optional additional detail, the current workflow status, and any current resolution summary. The operation is community-bound by design: the requested report must belong to the community identified by the path, and the response must never expose a report from another community through this route.
 *
 * Access to this operation is restricted to a member who holds moderation authority in the requested community. The authorization decision should be evaluated against community_platform_community_moderators, which is the canonical governance record for community-scoped moderation role assignments. A caller who is not an active moderator for the specified community, or who moderates a different community, must be denied access. This behavior follows the business requirement that report review lists and detailed report handling remain separated by community, and it preserves the privacy and data-isolation rule that moderation data for one community must remain separate from moderation data for other communities.
 *
 * The returned report detail should present the content required for moderator review visibility. In addition to the core community_platform_reports fields such as reason, detail, status, resolution, created_at, and updated_at, the response should include the identity of the reporting user and the reported content itself, because moderators reviewing a report in their community must be able to see the reported content, the reporter identity, and the reason text. The target content is polymorphic: if the report is linked through community_platform_report_posts, the operation should resolve the related community_platform_posts record; if it is linked through community_platform_report_comments, the operation should resolve the related community_platform_comments record and its containing post context.
 *
 * This operation must also account for unavailable moderation context. If the report is tied to content whose community is no longer available, the service must not present the item as normal active content for moderation review. Instead, it should return the report in a way that reflects unavailable content or deny normal access according to the service's error policy, while still preserving the rule that cross-community leakage must not occur.
 *
 * This endpoint is typically used after a moderator has discovered the item from the community report review list endpoint for the same community. The list operation gives the moderator the set of pending reports in that community, while this detail operation provides the full information necessary for a moderator to inspect one report before taking a separate review action.
 *
 * @param props.connection
 * @param props.communityId Target community ID for the moderation scope
 * @param props.reportId Target report ID within the specified community
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service that loads a single
 *   community-scoped report for moderator review.
 *
 * 1. Authorize the caller as an authenticated member. Resolve the caller's member identity, then query community_platform_community_moderators for an active, non-deleted assignment matching the caller and the path communityId. If no active assignment exists for the requested community, reject with a permission error. Do not authorize based solely on global membership or moderation rights in another community.
 *
 * 2. Load the report from community_platform_reports by reportId and community_platform_community_id = communityId, excluding records that should not participate in normal active review if business status rules mark them unavailable. If no such record exists, return not found rather than revealing whether the report exists in another community.
 *
 * 3. Join the related reporter account through community_platform_members and, when available, the public profile through community_platform_profiles so the response can expose reporter identity information suitable for moderator review. Only include fields intended for moderation visibility; do not expose credential or security fields such as password_hash.
 *
 * 4. Resolve the reported target. First check community_platform_report_posts for a one-to-one post target and join community_platform_posts plus its author/community context as needed. Also check community_platform_report_comments for a one-to-one comment target and join community_platform_comments, its parent community_platform_posts record, and related author/community context as needed. Exactly one target binding is expected in normal data. If both are absent, return a domain error for inconsistent report-target data.
 *
 * 5. If the resolved target content's effective community context is unavailable or inconsistent with the path communityId, treat the report as tied to unavailable content and do not present it as normal active moderation content. This case should produce a controlled domain response or not-found style failure according to service conventions, without exposing foreign-community data.
 *
 * 6. Optionally load review history summaries from community_platform_report_reviews for presentation in the detailed DTO if ICommunityPlatformReport includes them. Order review records by created_at ascending or descending consistently. Any included review history must remain within the same report and community moderation boundary.
 *
 * 7. Map the result to ICommunityPlatformReport. Populate the core report fields from community_platform_reports, attach reporter identity information derived from member/profile records, and include the resolved reported content view from either the post-target or comment-target branch. Preserve status and resolution exactly as stored. Keep timestamps in canonical ISO form.
 *
 * 8. Error handling: return permission denied for unauthorized members; return not found when the report does not belong to the requested community or does not exist; return an unavailable-content or invalid-state domain error when the report points to removed community context or lacks a valid target binding. No mutation, transaction write, or review-state update occurs in this operation.
 * @path /communityPlatform/member/communities/:communityId/reports/:reportId
 * @accessor api.functional.communityPlatform.member.communities.reports.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target community ID for the moderation scope
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target report ID within the specified community
     */
    reportId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformReport;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/communities/:communityId/reports/:reportId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/reports/${encodeURIComponent(props.reportId ?? "null")}`;
  export const random = (): ICommunityPlatformReport =>
    typia.random<ICommunityPlatformReport>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("reportId")(() => typia.assert(props.reportId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
