import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationActionReport } from "../../../../../../structures/ICommunityPlatformModerationActionReport";
import { ICommunityPlatformReport } from "../../../../../../structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "../../../../../../structures/IPageICommunityPlatformReport";

/**
 * Retrieve the report records linked to a specific moderation action within a specific community.
 *
 * This operation lets a community owner or community moderator inspect the complaint record associated with a moderation action that was performed in that same community. The underlying moderation action is stored as an audit log entry in the community_platform_moderation_actions table, which records the acting moderator assignment, the scoped community, the action category, and any optional audit note. The linked report target is normalized through community_platform_moderation_action_reports, and the actual report data comes from community_platform_reports, which stores the reporting member reference, the community scope, the member-provided reason, optional additional detail, current workflow status, and any recorded resolution.
 *
 * Security and visibility are community-scoped. The operation must only succeed when the caller has valid moderation standing in the community identified by communityId, because the requirements state that moderators can view only reports related to content in their own community and that moderation data must remain separated between communities. The same separation also means that a moderation action from one community must never expose a report belonging to another community. Platform administrators do not receive access through this endpoint merely by virtue of being admins, because the requirements explicitly exclude platform-wide administrative moderation powers.
 *
 * The response is intended for moderation audit and review interfaces that need to show the report intake context associated with a previously recorded moderation action. Consumers can expect summary-level report information suitable for list and inspector views, including the complaint reason and workflow state derived from the report record. Where the linked content or community is no longer normally available, the operation must still respect the business rule that such reports are treated as tied to unavailable content rather than surfaced as ordinary active moderation items.
 *
 * This endpoint is commonly used together with community-level moderation browsing APIs. A client will typically first identify the target moderation action from a moderation action list or detail screen, then call this endpoint to load the report record linked to that action. This endpoint does not itself approve, dismiss, or otherwise change the report; those state-changing behaviors belong to separate moderation review operations recorded in community_platform_report_reviews and, when applicable, related moderation action records.
 *
 * @param props.connection
 * @param props.communityId Target community identifier that scopes moderation visibility
 * @param props.moderationActionId Target moderation action identifier within the community
 * @param props.body Pagination, filtering, and sorting options for linked reports
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authorize the caller as a member holding active community-local governance authority for the target community. Resolve communityId against community_platform_communities.id and reject the request when the community does not exist or is not accessible in moderation context. Verify that the caller has an active community_platform_community_moderators assignment for the same community, treating owner-level standing as sufficient because owner is the highest authority in the community-specific moderation hierarchy.
 *
 * Resolve moderationActionId against community_platform_moderation_actions.id and enforce that the matched record belongs to the same community_platform_community_id as communityId. If the moderation action does not exist, is retired from active business use, or belongs to another community, return a not-found style failure to avoid cross-community disclosure.
 *
 * Query community_platform_moderation_action_reports joined to community_platform_reports using the moderation action identifier. Constrain the joined report by community_platform_reports.community_platform_community_id = communityId and exclude records whose soft deletion markers indicate they are no longer active unless the service's standard moderation browsing policy requires inclusion for audit visibility. Support pagination even though the association is expected to be small, and allow request-body filters on report workflow fields such as status, resolution, created_at range, and text search over reason or detail when those capabilities exist in ICommunityPlatformReport.IRequest. Default sort should prioritize most recently created reports first.
 *
 * Project the result into CommunityPlatform report summary DTOs. Include enough information for moderator review visibility requirements: report identity, reporter identity reference as exposed by the DTO, complaint reason text, workflow status, resolution, and timestamps. If the linked report concerns content whose community context is no longer normally available, preserve the report in an unavailable-content state according to business rules instead of treating it as ordinary active review content.
 *
 * Return a paginated response of type IPageICommunityPlatformReport.ISummary. When no linked report exists for the moderation action, return an empty page rather than fabricating a synthetic record. Do not mutate report review history, moderation action history, or report status in this operation. Keep the whole read path side-effect free.
 * @path /communityPlatform/member/communities/:communityId/moderationActions/:moderationActionId/reports
 * @accessor api.functional.communityPlatform.member.communities.moderationActions.reports.index
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
     * Target community identifier that scopes moderation visibility
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action identifier within the community
     */
    moderationActionId: string & tags.Format<"uuid">;

    /**
     * Pagination, filtering, and sorting options for linked reports
     */
    body: ICommunityPlatformReport.IRequest;
  };
  export type Body = ICommunityPlatformReport.IRequest;
  export type Response = IPageICommunityPlatformReport.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/communities/:communityId/moderationActions/:moderationActionId/reports",
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
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/reports`;
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
      assert.param("moderationActionId")(() =>
        typia.assert(props.moderationActionId),
      );
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
 * Retrieve a specific moderation-action report target record within a community moderation context.
 *
 * This operation returns the detailed subtype record that links a community moderation action to the report it targeted. In the database model, `community_platform_moderation_action_reports` is described as a one-to-one subtype record that links a moderation action to a specific reported item via its parent `community_platform_reports` record. The returned resource therefore represents the normalized report-target association for an auditable moderation workflow, rather than the full moderation action history or the full report queue by itself.
 *
 * Access to this operation is restricted by community-scoped moderation authority. Requirements state that moderators may review only reports from the community they moderate, and that report handling must remain separated by community. The implementation must therefore verify that the caller holds a valid moderation assignment for the community identified by `communityId`, that the parent moderation action belongs to that same community, and that the linked report is also scoped to that community. Platform-wide administration is not applicable here because the requirements explicitly deny global moderation authority outside community-local ownership and moderation roles.
 *
 * This operation is closely related to moderator report-review workflows. A moderator would typically reach this detail endpoint after browsing the community's report review list and identifying a specific moderation action record that targeted a report. The returned data should reflect the subtype relationship and support inspection of how a formal content complaint, stored in `community_platform_reports`, was connected to an audit-log moderation action in `community_platform_moderation_actions`.
 *
 * The operation must also respect unavailable-community and unavailable-content handling. If the referenced community no longer exists, or if the moderation action, report, or subtype link cannot be resolved under the requested community scope, the system must not expose the resource as if it were a normal active moderation record. Instead, it should treat the request as unavailable or inaccessible according to community-scoped visibility rules. This preserves the data-isolation rule that reports for a post or comment must appear only within the report handling context of the related community.
 *
 * @param props.connection
 * @param props.communityId Target community's UUID that scopes moderation authority and report visibility
 * @param props.moderationActionId Target moderation action's UUID within the specified community
 * @param props.moderationActionReportId Target moderation action report link UUID under the specified moderation action
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service that resolves one `community_platform_moderation_action_reports` record by `moderationActionReportId` under the nested community and moderation action context.
 *
 * First, authenticate the caller as a member and verify that the caller has community-local moderation authority for `communityId`, either through an owner-equivalent moderation assignment or a moderator assignment in the target community. Do not allow access for guests, ordinary members without moderation standing in that community, or platform admins acting without community-local authority.
 *
 * Next, load the parent `community_platform_moderation_actions` row by `moderationActionId` and confirm that its `community_platform_community_id` exactly matches `communityId` and that the record is active for business use. Then load the `community_platform_moderation_action_reports` row by `moderationActionReportId` and confirm that its `community_platform_moderation_action_id` matches the already-resolved moderation action. Join the linked `community_platform_reports` row through `community_platform_report_id` and verify that the report's `community_platform_community_id` also matches `communityId`. These checks are mandatory to enforce path consistency and prevent cross-community or cross-action data leakage.
 *
 * Return the detailed DTO for the subtype resource using fields from `community_platform_moderation_action_reports`, and include referenced report relationship data only as supported by the DTO contract generated elsewhere. Do not invent fields that are not backed by schema columns or established DTO composition. Preserve timestamps such as `created_at`, `updated_at`, and `deleted_at` according to the DTO definition.
 *
 * If any lookup fails, or if the nesting is inconsistent, return a not-found style failure rather than exposing whether a record exists outside the caller's authorized community scope. If the community is unavailable or the linked content is treated as unavailable under report-review rules, treat the resource as unavailable in normal moderation review flow. No transaction is required beyond consistent reads, but all authorization and scope validations must occur before returning the resource.
 * @path /communityPlatform/member/communities/:communityId/moderationActions/:moderationActionId/reports/:moderationActionReportId
 * @accessor api.functional.communityPlatform.member.communities.moderationActions.reports.at
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
     * Target community's UUID that scopes moderation authority and report visibility
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action's UUID within the specified community
     */
    moderationActionId: string & tags.Format<"uuid">;

    /**
     * Target moderation action report link UUID under the specified moderation action
     */
    moderationActionReportId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformModerationActionReport;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/communities/:communityId/moderationActions/:moderationActionId/reports/:moderationActionReportId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/reports/${encodeURIComponent(props.moderationActionReportId ?? "null")}`;
  export const random = (): ICommunityPlatformModerationActionReport =>
    typia.random<ICommunityPlatformModerationActionReport>();
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
      assert.param("moderationActionId")(() =>
        typia.assert(props.moderationActionId),
      );
      assert.param("moderationActionReportId")(() =>
        typia.assert(props.moderationActionReportId),
      );
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
