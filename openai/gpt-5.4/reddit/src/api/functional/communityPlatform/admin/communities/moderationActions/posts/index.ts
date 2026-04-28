import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationActionPost } from "../../../../../../structures/ICommunityPlatformModerationActionPost";
import { ICommunityPlatformPost } from "../../../../../../structures/ICommunityPlatformPost";

/**
 * Retrieve the post that was targeted by a specific moderation action within a specific community.
 *
 * This operation exposes the post-target linkage stored for a community-scoped moderation action. The underlying moderation action record is an audit log of community moderation activity that captures which community-local moderator assignment acted, in which community the action occurred, what action category was performed, and any optional audit note. The post target itself is normalized into a dedicated one-to-one subtype record so that the system can precisely reconstruct which post was affected by a given moderation event. The returned post is the top-level community post authored by a member within a specific community and includes the canonical post identity, authorship context, community placement, content-type classification, and lifecycle state.
 *
 * Access to this operation must be limited to authorized community-local governance actors for the specified community. The requirements explicitly state that elevated authority is local to each community: the community owner is the highest-authority role inside that community, moderators operate only within the relevant community, and no platform-wide administrative moderation authority is granted to admins in the current scope. Implementations must therefore verify that the caller holds an appropriate owner or moderator role in the target community before exposing moderation audit context.
 *
 * The operation is tightly bound to community isolation rules. Moderation data for one community must remain separate from moderation data for other communities, and reports, bans, moderation actions, posts, and related artifacts must remain associated with the community to which they belong. For that reason, the communityId path parameter is not redundant even though the moderation action already stores a scoped community reference. The service must use the provided communityId to validate that the requested moderation action belongs to that community and that the linked post also belongs to the same community context.
 *
 * This endpoint is typically used together with community moderation action list or detail views that first identify the relevant moderation action. After the client has obtained a moderation action identifier from a moderation audit screen, this operation can be called to load the concrete post record that the action targeted. If the moderation action does not have a post target subtype row, or if the action exists in a different community than the provided path context, the request must fail rather than falling back to unrelated data.
 *
 * Expected failures include missing community records, missing moderation action records, community mismatches, absent post-target linkage, linked post absence, and authorization denial for users who are not valid community-local moderators or owners. The operation is read-only and must not alter moderation records, post records, or target-link state.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderationActionId Target moderation action's ID within the community
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1. Authenticate the caller and require a member
 *   identity. 2. Resolve the caller's community-local authority for the target
 *   community. Permit access only when the caller holds the owner or moderator
 *   role for the specified community. Do not grant access based on
 *   platform-wide admin status because current requirements do not define such
 *   authority. 3. Load the community_platform_communities row by communityId
 *   and reject when it does not exist. 4. Load the
 *   community_platform_moderation_actions row by moderationActionId and reject
 *   when it does not exist. 5. Verify that
 *   community_platform_moderation_actions.community_platform_community_id
 *   exactly matches communityId. Reject on mismatch to preserve community
 *   isolation. 6. Load the one-to-one
 *   community_platform_moderation_action_posts row by
 *   community_platform_moderation_action_id = moderationActionId. Reject when
 *   no post-target subtype exists for the moderation action. 7. Load the target
 *   community_platform_posts row by the subtype's community_platform_post_id.
 *   8. Verify that community_platform_posts.community_platform_community_id
 *   exactly matches communityId. Reject on mismatch because moderation targets
 *   must remain associated with the community to which they belong. 9. Return
 *   the detailed post DTO mapped from the post row. Include post identity,
 *   author linkage, community linkage, title, post_type, status, created_at,
 *   updated_at, and deletion-state representation according to the project DTO
 *   conventions. 10. Perform no mutation. This is a read-only audit retrieval
 *   operation.
 *
 * Implementation notes:
 * - Use a consistent not-found response strategy so callers cannot infer cross-community moderation data.
 * - The query path can be implemented either as sequential reads or as a join across community_platform_moderation_actions, community_platform_moderation_action_posts, and community_platform_posts filtered by communityId and moderationActionId.
 * - If the post row is marked deleted or removed through lifecycle state, still return the record when the moderation actor is authorized, because auditability and enforcement traceability are core purposes of the moderation-action target linkage.
 * - Log access in application telemetry if audit-view tracking is supported, but do not create new database moderation records for this read.
 * @path /communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/posts
 * @accessor api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionid
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function getByCommunityidAndModerationactionid(
  connection: IConnection,
  props: getByCommunityidAndModerationactionid.Props,
): Promise<getByCommunityidAndModerationactionid.Response> {
  return true === connection.simulate
    ? getByCommunityidAndModerationactionid.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...getByCommunityidAndModerationactionid.METADATA,
          path: getByCommunityidAndModerationactionid.path(props),
          status: null,
        },
      );
}
export namespace getByCommunityidAndModerationactionid {
  export type Props = {
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action's ID within the community
     */
    moderationActionId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformPost;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/posts",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/posts`;
  export const random = (): ICommunityPlatformPost =>
    typia.random<ICommunityPlatformPost>();
  export const simulate = (
    connection: IConnection,
    props: getByCommunityidAndModerationactionid.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: getByCommunityidAndModerationactionid.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderationActionId")(() =>
        typia.assert(props.moderationActionId),
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

/**
 * Retrieve the detailed post-target record for a single community moderation action within the specified community.
 *
 * This operation exposes the normalized one-to-one subtype stored in the community_platform_moderation_action_posts table, which identifies which community_platform_posts record was targeted by a specific community_platform_moderation_actions audit entry. It is intended for moderation-detail screens, audit review flows, and traceability features where a client already knows the community and parent moderation action context and needs the exact post-target linkage record associated with that action.
 *
 * Access to this operation is community-scoped rather than platform-wide. The current requirements state that elevated authority is bounded to the relevant community, with community ownership and community moderation as the only approved sources of elevated power. Because moderation data for one community must remain separate from other communities, the server must ensure that the requested moderation action belongs to the specified community and that the linked target post also belongs to that same community before returning the record. Platform admins do not receive unrestricted cross-community moderation visibility under the current scope.
 *
 * The underlying data model separates generic moderation audit records from target-specific subtype rows. The parent community_platform_moderation_actions record captures who acted, in which community the action occurred, the action_type, and the optional moderator-entered note. The child community_platform_moderation_action_posts record then stores the exact target post reference through community_platform_post_id. This separation preserves normalized audit structure and makes the endpoint useful when clients need to inspect how a post-related moderation action was recorded.
 *
 * This endpoint is commonly used together with the parent moderation action detail endpoint for the same community and moderation action. Clients typically obtain the broader moderation action first to inspect action metadata such as category and note, then retrieve the post-target subtype detail when the action is known to concern a post. The returned record should therefore be consistent with the parent moderation action context and must not be returned if the nesting relationship is broken.
 *
 * If any path identifier does not exist, if the moderation action is outside the specified community, if the subtype row does not belong to the given moderation action, or if the caller lacks active moderation authority in that community, the operation must fail rather than leaking audit or post-target information across community boundaries.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderationActionId Target moderation action's ID within the community
 * @param props.moderationActionPostId Target moderation action post record's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Load the caller's member identity and verify that the
 *   caller holds community-local elevated authority for the specified
 *   community. Authorization must succeed only when the caller is either the
 *   owner of the target community or has an active
 *   community_platform_community_moderators assignment for the same community
 *   with a status representing active standing. Do not authorize guests,
 *   ordinary members without local moderation authority, or platform admins
 *   acting outside a community-local role.
 *
 * Query community_platform_moderation_action_posts by id = moderationActionPostId, joining its parent community_platform_moderation_actions and referenced community_platform_posts rows. Enforce all nested invariants in the same retrieval flow: the parent moderation action id must equal moderationActionId, the parent moderation action's community_platform_community_id must equal communityId, and the target post's community_platform_community_id must also equal communityId. If any invariant fails, return a not-found style error so cross-community or broken-parent information is not disclosed.
 *
 * When building the response DTO, include the subtype row's identity and timestamps and embed or map the related parent moderation action and target post information according to the ICommunityPlatformModerationActionPost shape defined in components schemas. The implementation should preserve the distinction between the generic audit action record and the post-target subtype rather than flattening away the relationship semantics.
 *
 * Exclude soft-deleted records from ordinary retrieval unless the domain DTO for this endpoint is explicitly designed to expose archived audit history. At minimum, do not return rows whose parent community, moderation action, target subtype row, related moderator assignment, or target post has been deleted from active visibility in a way that should hide them from standard moderation-detail views. Keep the decision consistent with the service's broader moderation-history policy.
 *
 * Return clear errors for: unauthorized caller, missing community, missing moderation action, missing moderation action post target, and mismatched nesting between the three identifiers. All reads are non-mutating and should execute without a write transaction, though a single consistent read path should be used to avoid partially validated relationships.
 * @path /communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/posts/:moderationActionPostId
 * @accessor api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionidAndModerationactionpostid
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function getByCommunityidAndModerationactionidAndModerationactionpostid(
  connection: IConnection,
  props: getByCommunityidAndModerationactionidAndModerationactionpostid.Props,
): Promise<getByCommunityidAndModerationactionidAndModerationactionpostid.Response> {
  return true === connection.simulate
    ? getByCommunityidAndModerationactionidAndModerationactionpostid.simulate(
        connection,
        props,
      )
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...getByCommunityidAndModerationactionidAndModerationactionpostid.METADATA,
          path: getByCommunityidAndModerationactionidAndModerationactionpostid.path(
            props,
          ),
          status: null,
        },
      );
}
export namespace getByCommunityidAndModerationactionidAndModerationactionpostid {
  export type Props = {
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action's ID within the community
     */
    moderationActionId: string & tags.Format<"uuid">;

    /**
     * Target moderation action post record's ID
     */
    moderationActionPostId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformModerationActionPost;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/posts/:moderationActionPostId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/posts/${encodeURIComponent(props.moderationActionPostId ?? "null")}`;
  export const random = (): ICommunityPlatformModerationActionPost =>
    typia.random<ICommunityPlatformModerationActionPost>();
  export const simulate = (
    connection: IConnection,
    props: getByCommunityidAndModerationactionidAndModerationactionpostid.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: getByCommunityidAndModerationactionidAndModerationactionpostid.path(
        props,
      ),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderationActionId")(() =>
        typia.assert(props.moderationActionId),
      );
      assert.param("moderationActionPostId")(() =>
        typia.assert(props.moderationActionPostId),
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
