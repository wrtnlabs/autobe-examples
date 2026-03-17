import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformModerationActionComment } from "../../../../../../structures/ICommunityPlatformModerationActionComment";
import { IPageICommunityPlatformModerationActionComment } from "../../../../../../structures/IPageICommunityPlatformModerationActionComment";

/**
 * Retrieve a filtered and paginated list of comment target records attached to a specific moderation action within a specific community.
 *
 * This operation serves community-scoped moderation audit and review workflows. The community platform stores moderation actions as audit log records in `community_platform_moderation_actions`, including the scoped community, the acting moderation assignment, the action category, and an optional moderator-entered note. Comment-specific targeting is normalized into `community_platform_moderation_action_comments`, which binds one moderation action to one target comment. By listing the comment target collection beneath a single moderation action, clients can inspect which comment record was affected while preserving the community-local governance boundaries defined by the moderation model.
 *
 * Access to this operation is limited to users who hold moderation authority in the specified community, including the owner and community moderators. This restriction is required because moderation authority is local to one community and does not extend platform-wide. The operation must therefore verify both that the supplied `moderationActionId` belongs to the supplied `communityId` and that the caller has a valid moderation relationship in that same community before returning any data. Moderation data for one community must remain isolated from other communities, and this endpoint must not expose records across community boundaries.
 *
 * The returned records are derived from `community_platform_moderation_action_comments` and joined to `community_platform_comments` so consumers can review information about the targeted discussion entry. The target comment represents a threaded discussion comment written by a member within a post conversation, with fields such as the comment body, lifecycle status, author reference, post reference, optional parent comment reference for reply threading, and creation and update timestamps. Because comments support nested reply structure and later unavailability when deleted, the response should help moderation interfaces distinguish active, removed, and unavailable comment targets without altering the audit record itself.
 *
 * This endpoint is typically used together with broader moderation review screens that first identify a community and then inspect a specific moderation action. It complements community moderation workflows such as comment deletion by moderators or owners in their own community and audit inspection of actions taken against community discussion content. When the specified community does not exist, the moderation action does not belong to that community, or the caller lacks community-scoped moderation authority, the operation must reject the request. When no child comment-target record exists for the selected moderation action, the operation should return an empty paginated result rather than exposing unrelated records.
 *
 * @param props.connection
 * @param props.communityId Target community's ID that scopes moderation authority and data isolation
 * @param props.moderationActionId Target moderation action's ID within the specified community
 * @param props.body Search criteria, filters, sorting, and pagination for moderation action comment targets
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement this operation as a community-scoped search endpoint over `community_platform_moderation_action_comments` constrained by a parent moderation action.
 *
 * First, authenticate the caller as a member and load the caller's community moderation standing for the supplied `communityId`. Authorize only if the caller is the community owner or a member holding a moderator assignment in that same community. Do not grant access based on platform-wide admin identity alone, because no global moderation authority is defined.
 *
 * Next, validate that a `community_platform_moderation_actions` record exists for `moderationActionId`, is associated with `communityId` through `community_platform_community_id`, and is not excluded by business rules for unavailable parent records. Reject the request if the parent moderation action is missing or belongs to a different community. Then query `community_platform_moderation_action_comments` where `community_platform_moderation_action_id = :moderationActionId`. Join the parent moderation action to reassert community scope, and join `community_platform_comments` as the target comment to expose summary information needed by moderation clients.
 *
 * Support request-body driven browsing behavior consistent with list endpoints: pagination, optional filtering, and sorting. Filtering may include target comment `status`, created-at ranges on either the target linkage or the comment itself, whether the target comment has `deleted_at` set, and text search over the target comment `body` when supported. Sorting should default to newest linkage first using `community_platform_moderation_action_comments.created_at DESC`, with optional alternatives based on linkage creation time or target comment creation time. Preserve strict community scoping in every query path.
 *
 * Construct each summary item from actual loaded schema fields. Include identifiers and timestamps from `community_platform_moderation_action_comments`, and include joined target comment summary data from `community_platform_comments` such as `id`, `community_platform_post_id`, `community_platform_member_id`, `parent_id`, `body`, `status`, `created_at`, `updated_at`, and `deleted_at` as defined by the DTO contract. Do not mutate moderation records or comment records in this endpoint.
 *
 * Return a paginated result object. If the parent moderation action exists but has no comment target record, return an empty page. Handle authorization failure, cross-community mismatch, and missing parent action as errors. Keep all reads isolated to the specified community and never leak moderation metadata from another community.
 * @path /communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/comments
 * @accessor api.functional.communityPlatform.admin.communities.moderationActions.comments.index
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
     * Target community's ID that scopes moderation authority and data isolation
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action's ID within the specified community
     */
    moderationActionId: string & tags.Format<"uuid">;

    /**
     * Search criteria, filters, sorting, and pagination for moderation action comment targets
     */
    body: ICommunityPlatformModerationActionComment.IRequest;
  };
  export type Body = ICommunityPlatformModerationActionComment.IRequest;
  export type Response =
    IPageICommunityPlatformModerationActionComment.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/comments",
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
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/comments`;
  export const random =
    (): IPageICommunityPlatformModerationActionComment.ISummary =>
      typia.random<IPageICommunityPlatformModerationActionComment.ISummary>();
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
 * Retrieve a single comment-target record attached to a moderation action within a specific community moderation context.
 *
 * This operation returns the normalized comment-target linkage for a moderation action recorded in the community platform's moderation audit domain. The underlying moderation action table stores the shared audit record for an enforcement step taken by a community-local owner or moderator, including the acting community moderation assignment, the scoped community, the moderation action category, and an optional explanatory note. The moderation action comment table then specializes that audit record by linking it to the exact discussion comment that was targeted. This endpoint is therefore used when a client needs the detailed target record for a moderation event rather than only the general moderation action header.
 *
 * The operation is intended for community-scoped governance workflows. Current requirements state that moderators may delete comments only within their own community and that owners may also delete any comment in their own community. The same requirements also state that moderation data for one community must remain separate from moderation data for other communities. For that reason, the endpoint is nested under the community and moderation action identifiers and must only return a record when the moderation action belongs to the specified community and the target linkage belongs to the specified moderation action.
 *
 * The returned resource reflects the schema design where moderation action targets are normalized into dedicated subtype tables instead of being stored as nullable polymorphic columns on the main moderation action row. In this case, the specialized row identifies the target comment through community_platform_comment_id while the parent moderation action supplies the broader governance metadata such as action_type and note. The referenced comment itself represents a threaded discussion entry attached to a post conversation, authored by a member, optionally linked to a parent comment for reply threading, and managed with lifecycle fields such as status, updated_at, and deleted_at.
 *
 * Access to this operation must be restricted to actors who hold community-local moderation authority for the specified community. Guests must not access moderation internals. Ordinary members without the relevant community moderation standing must not inspect this record. Platform admins must not be granted access solely by virtue of being admins, because the current requirements explicitly state that no platform-wide moderation authority exists. If the client needs broader moderation context, it should first retrieve the parent moderation action and then use this endpoint to inspect the comment-specific target association.
 *
 * Expected failure cases include a missing community, a missing moderation action, a missing moderation action comment record, or a mismatch where the provided moderation action does not belong to the provided community or the provided moderation action comment does not belong to the provided moderation action. The service should also reject requests from users who do not hold owner or moderator authority in the specified community. These checks are necessary to preserve community isolation and ensure that moderation records are not exposed across unrelated communities.
 *
 * @param props.connection
 * @param props.communityId Target community's ID that scopes the moderation record
 * @param props.moderationActionId Target moderation action's ID within the specified community
 * @param props.moderationActionCommentId Target moderation action comment record's ID linked to the specified moderation action
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a read-only detail query for the community_platform_moderation_action_comments table scoped through its parent moderation action and community.
 *
 * 1. Authenticate the caller as a member identity. Reject guests and any unauthenticated access before database lookup.
 * 2. Resolve whether the caller holds community-local moderation authority for the target community, meaning owner or moderator standing in that community. Do not grant access based on platform admin status alone.
 * 3. Query community_platform_moderation_actions by id = moderationActionId and community_platform_community_id = communityId. If no row exists, return a not-found error rather than leaking whether either identifier exists independently.
 * 4. Query community_platform_moderation_action_comments by id = moderationActionCommentId and community_platform_moderation_action_id = moderationActionId. If no row exists, return not found.
 * 5. Join or subsequently load the referenced community_platform_comments row by community_platform_comment_id to enrich the response type if the DTO includes nested comment information. When loading comment details, preserve the actual current fields from the schema: post reference, member reference, optional parent_id, body, status, created_at, updated_at, and deleted_at.
 * 6. If the implementation supports nested moderation action details in the response DTO, also include the parent moderation action fields id, community_platform_community_moderator_id, community_platform_community_id, action_type, note, created_at, updated_at, and deleted_at.
 * 7. Ensure the response reflects the normalized subtype design: this record is the comment-specific target association of a moderation action, not the moderation decision itself.
 * 8. Keep the operation side-effect free. Do not modify timestamps, audit rows, or comment lifecycle state during retrieval.
 * 9. Return authorization failure when the caller lacks moderator or owner authority in the specified community. Return not found for broken parent-child-community relationships to maintain isolation.
 * 10. Use consistent transaction/read semantics if multiple joins are performed so the moderation action row and target row are read from a coherent snapshot.
 *
 * Implementation should preserve community data isolation: the service must never return a moderation action comment target if its parent moderation action is associated with another community or if the caller's authority belongs to another community.
 * @path /communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/comments/:moderationActionCommentId
 * @accessor api.functional.communityPlatform.admin.communities.moderationActions.comments.at
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
     * Target community's ID that scopes the moderation record
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderation action's ID within the specified community
     */
    moderationActionId: string & tags.Format<"uuid">;

    /**
     * Target moderation action comment record's ID linked to the specified moderation action
     */
    moderationActionCommentId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformModerationActionComment;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/communities/:communityId/moderationActions/:moderationActionId/comments/:moderationActionCommentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/communities/${encodeURIComponent(props.communityId ?? "null")}/moderationActions/${encodeURIComponent(props.moderationActionId ?? "null")}/comments/${encodeURIComponent(props.moderationActionCommentId ?? "null")}`;
  export const random = (): ICommunityPlatformModerationActionComment =>
    typia.random<ICommunityPlatformModerationActionComment>();
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
      assert.param("moderationActionCommentId")(() =>
        typia.assert(props.moderationActionCommentId),
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
