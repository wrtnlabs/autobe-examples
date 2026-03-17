import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformComment } from "../../../../../structures/ICommunityPlatformComment";

export * as files from "./files/index";
export * as snapshots from "./snapshots/index";

/**
 * Create a new comment within the discussion thread of a specific post.
 *
 * This operation lets an authenticated member add a written discussion entry to an existing post represented by the `community_platform_posts` table. The new record is stored in `community_platform_comments`, which is the canonical table for threaded discussion comments and contains the post relationship, author relationship, optional parent comment reference, current textual body, and lifecycle state fields. The created comment is attached to the target post through `community_platform_post_id`, linked to the current member through `community_platform_member_id`, and documented with `created_at` and `updated_at` timestamps as part of the current canonical comment record.
 *
 * This endpoint also supports reply creation within the same discussion model. Because the comment schema includes an optional `parent_id` self-reference and a recursive parent-child relation, the client may create either a top-level post comment or a nested reply by supplying a parent comment identifier in the request body. When a reply is created, the system must preserve the exact parent-child relationship so the discussion can later be rendered as a nested thread beneath the correct branch, consistent with the requirement that replies remain attached to the correct comment chain without depth limit.
 *
 * Access to this operation is limited to authenticated members. Guests are not permitted to comment. Before insertion, the service must verify that the target post is available for participation by checking the post lifecycle information in `community_platform_posts`, including whether the post has been removed from normal activity by status or deletion timestamp. The service must also verify that the acting member is not currently banned from participation in the post's community by consulting `community_platform_community_bans`, whose records capture the affected community, banned member, reason, lifecycle status, start time, expiration time, and manual lifting state.
 *
 * The operation is intended to be used together with comment retrieval operations for the same post discussion. After a successful creation, clients will typically refresh or merge the returned comment into the displayed thread for the post. Comment browsing and sorting behavior such as Best, New, and Controversial are handled by the comment listing endpoint, while this creation endpoint focuses only on adding one new discussion entry and returning the created resource.
 *
 * If the target post does not exist, is not available for commenting, or if a supplied parent comment does not exist or does not belong to the same post discussion, the request must be rejected. If the member is banned in the relevant community, the request must also be rejected. These validations ensure that comments are only created in valid discussion contexts and remain structurally consistent with the post-centered thread hierarchy.
 *
 * @param props.connection
 * @param props.postId Target post identifier
 * @param props.body Comment creation information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a member-authenticated create flow for `community_platform_comments`.
 *
 * 1. Resolve the authenticated member identity from the session context. Reject unauthenticated callers.
 * 2. Load the target post from `community_platform_posts` by `id = postId`. Reject when not found. Reject when the post is not available for participation, including cases where `deleted_at` is not null or its `status` indicates removed or moderated non-participation state according to business rules.
 * 3. Determine the post's community from `community_platform_posts.community_platform_community_id`.
 * 4. Query `community_platform_community_bans` for an active participation ban matching the target community and authenticated member. Treat a ban as blocking when it is not logically deleted (`deleted_at` is null), its lifecycle state is active, it has started, it has not been manually lifted, and it has not expired as of the current time. Reject the request if such a ban exists.
 * 5. Validate the request body. Require non-empty comment text mapped to `community_platform_comments.body`. If `parentId` is provided, load the parent comment from `community_platform_comments` and reject when not found, when it is unavailable for reply participation, or when its `community_platform_post_id` does not equal `postId`. This guarantees replies remain inside the same post discussion tree.
 * 6. Create a new `community_platform_comments` row inside a transaction with a generated UUID `id`, `community_platform_post_id = postId`, `community_platform_member_id` from the authenticated session, optional `parent_id`, `body` from the request, an active initial `status`, current `created_at`, current `updated_at`, and `deleted_at = null`.
 * 7. Return the created comment resource in the response. The returned model should reflect the persisted comment record and any related projections normally included in `ICommunityPlatformComment`.
 *
 * Error handling requirements:
 * - 401 or equivalent authorization failure for guests or missing member session.
 * - 404 or equivalent when the target post does not exist.
 * - 400 or 404 when `parentId` is invalid for the target post context.
 * - 403 or equivalent when the member is banned from the community containing the post.
 * - 409 or equivalent when the post or parent comment lifecycle state does not allow new comments.
 *
 * Do not accept author identity or post identity from the request body because those are derived from the authenticated session and path parameter. Keep reply linkage optional so the same endpoint can create both top-level comments and nested replies.
 * @path /communityPlatform/member/posts/:postId/comments
 * @accessor api.functional.communityPlatform.member.posts.comments.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Target post identifier
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Comment creation information
     */
    body: ICommunityPlatformComment.ICreate;
  };
  export type Body = ICommunityPlatformComment.ICreate;
  export type Response = ICommunityPlatformComment;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/posts/:postId/comments",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments`;
  export const random = (): ICommunityPlatformComment =>
    typia.random<ICommunityPlatformComment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
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
 * Update an existing discussion comment within a specific post thread.
 *
 * This operation modifies the current canonical record stored in `community_platform_comments`, the table that represents threaded discussion comments written by members within post conversations. The underlying comment record belongs to exactly one post through `community_platform_post_id`, exactly one author through `community_platform_member_id`, and may optionally point to a parent comment through `parent_id` when the comment is part of a reply branch. Because the platform requirements define comments as discussion entries attached to a post and replies as part of a preserved nested structure, this endpoint updates the comment's editable content while keeping its post association and reply placement stable.
 *
 * Access to this operation is restricted to authenticated actors with participation or moderation authority. Guests are not permitted to perform comment participation actions. A member may update a comment the member authored, subject to community participation restrictions. In addition, community owners and moderators may manage comments within their own community when acting under moderation authority for content review workflows. If the acting member is banned in the community that contains the post, the service must reject ordinary participation edits because bans restrict posting and commenting activity in that community.
 *
 * The operation is tightly related to the `community_platform_posts` and `community_platform_community_bans` tables. The post record defines the containing community for the discussion, and the ban record defines whether the acting member is restricted from active participation in that community. The service must confirm that the requested `commentId` belongs to the requested `postId` before applying any change. This guards against cross-post access attempts and keeps the comment thread consistent with the hierarchy described in the requirements, where posts are the root content item and comments form nested branches beneath them.
 *
 * Validation should focus on fields that are truly editable in the current comment record. The `body` column is the primary user-managed content field and may be revised when a member edits a comment. By contrast, `community_platform_post_id`, `community_platform_member_id`, and `parent_id` define ownership, placement, and reply structure and must not be reassigned through this endpoint. The comment `status` may only be altered when the caller has moderation authority and the requested transition is supported by business rules. The service must reject updates for unavailable posts, unavailable comments, mismatched post-comment pairs, missing permissions, or comments that are no longer eligible for normal editing.
 *
 * This operation is commonly used together with post detail and comment listing APIs. A client typically retrieves the post discussion first, identifies the target comment in the thread, then sends this update request, and finally refreshes the thread view so that the edited comment appears in the same branch and current sort order. Error handling should be explicit: not found when the post or comment does not exist in active scope, forbidden when the actor lacks authorship or community moderation authority, and bad request when immutable relationship fields are attempted to be changed.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.commentId Target comment's ID
 * @param props.body Updated comment content
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Load the target post from `community_platform_posts` by `postId` and ensure it is available for interaction. Load the target comment from `community_platform_comments` by `commentId` and verify `community_platform_post_id` matches the requested post. Reject the request when either record is not found in active scope or when the post-comment relationship does not match the nested route.
 *
 * Authorize the caller as an authenticated member. Permit update when the caller is the comment author identified by `community_platform_member_id`. Also permit update when the caller holds community owner or moderator authority for the community that owns the post, because moderation workflows allow privileged community roles to manage comments in their own community. For ordinary self-editing, check `community_platform_community_bans` for an active ban on the acting member in the post's community and reject if participation is restricted.
 *
 * Apply only editable updates from `ICommunityPlatformComment.IUpdate`. Treat `body` as the normal mutable field. Do not allow reassignment of author, post, or parent linkage through this operation. If the update DTO includes moderation-capable fields such as `status`, enforce additional authorization and accepted state transitions in service logic before persisting changes. Always update `updated_at` to the current timestamp when a modification is saved.
 *
 * Persist the comment update in a single transaction. Return the refreshed canonical comment resource after update so clients can redraw the affected thread node immediately. The response should reflect the stored current record from `community_platform_comments`. Handle empty or invalid content according to the comment business rules implemented in the service layer. Return not found for unavailable post or comment targets, forbidden for unauthorized actors, and bad request for invalid mutation attempts against immutable relational fields.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId
 * @accessor api.functional.communityPlatform.member.posts.comments.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment's ID
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Updated comment content
     */
    body: ICommunityPlatformComment.IUpdate;
  };
  export type Body = ICommunityPlatformComment.IUpdate;
  export type Response = ICommunityPlatformComment;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}`;
  export const random = (): ICommunityPlatformComment =>
    typia.random<ICommunityPlatformComment>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
      assert.param("commentId")(() => typia.assert(props.commentId));
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
 * Permanently remove a specific discussion comment from a post conversation.
 *
 * This operation targets one record in the community_platform_comments table, which stores the current canonical comment content, its author, the post it belongs to, and an optional parent comment for reply threading. The request is scoped by both the post identifier and the comment identifier so the service can confirm that the specified comment truly belongs to the specified post before removing it from active community content.
 *
 * Authorization for this operation must follow community participation and moderation boundaries. A member may use this operation to remove the member's own comment when acting on content the member authored. In addition, a community moderator or the community owner may remove any comment within that community as part of moderation workflows. The service must reject attempts to remove a comment outside the moderator's own community, and it must reject requests for comments or posts that do not exist or do not match the supplied path relationship.
 *
 * The underlying data relationship is important for correct behavior. The community_platform_comments record references community_platform_posts through community_platform_post_id, and the post record references its container community through community_platform_community_id. This means the implementation should resolve the target post first or join the comment and post records together, then enforce that the comment is attached to the given post and that the acting user has authority in that post's community. Because comment records may participate in reply threading through parent_id and child comment relations, the implementation should ensure deletion behavior remains consistent with the platform's comment tree rules and does not leave the API exposing invalid thread references.
 *
 * This endpoint is commonly used together with comment browsing operations on the same post. Clients typically retrieve post details and threaded comments first, then invoke this operation for a specific comment that should no longer remain in community content. After successful removal, subsequent post or comment retrieval operations should no longer present the deleted comment as active discussion content.
 *
 * If the target comment cannot be found, if the target post cannot be found, if the comment does not belong to the supplied post, or if the actor lacks permission within the community, the service must reject the request. The operation is intended for direct content removal and should apply the platform's defined deletion outcome immediately so the removed comment no longer remains available as active content.
 *
 * @param props.connection
 * @param props.postId Target post ID that contains the comment.
 * @param props.commentId Target comment ID to remove from the post.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a service-layer deletion routine for a single comment under a specific post.
 *
 * 1. Authenticate the actor and require a member session for self-removal or a member session with community moderation standing for moderation removal.
 * 2. Load the target post from community_platform_posts by id = postId. If not found, reject the request.
 * 3. Load the target comment from community_platform_comments by id = commentId. If not found, reject the request.
 * 4. Verify community_platform_comments.community_platform_post_id equals postId. If not, reject the request because the nested path relationship is invalid.
 * 5. Determine authorization:
 *    - allow when the acting member is the comment author via community_platform_comments.community_platform_member_id;
 *    - allow when the acting member is the owner or an assigned moderator of the post's community;
 *    - otherwise reject the request.
 * 6. For moderator or owner execution, enforce community scope using the post's community_platform_community_id so moderation authority is limited to the same community.
 * 7. Apply deletion in a transaction. Remove the target comment from active use according to the platform deletion outcome. Because the schema contains deleted_at and status fields, update the record consistently with the domain's deletion handling and ensure subsequent read queries exclude removed comments from normal participation views. If physical deletion is the project convention for this entity in realization, the same transaction must also preserve referential consistency for threaded descendants.
 * 8. Ensure reply-thread integrity. If child comments depend on the parent comment for traversal, apply the project's established comment-tree handling so no invalid or orphaned active references remain exposed through retrieval APIs.
 * 9. Persist audit-relevant timestamps or status transitions as required by the entity model, using updated_at consistently when the record is state-transitioned rather than physically removed.
 * 10. Return success with no response body.
 *
 * Error handling:
 * - reject when postId or commentId is malformed;
 * - reject when the post does not exist;
 * - reject when the comment does not exist;
 * - reject when the comment is not attached to the supplied post;
 * - reject when the actor lacks authorship or community moderation authority;
 * - reject when the actor attempts moderation outside the actor's own community scope.
 *
 * Testing considerations should include author self-removal, moderator removal within community, owner removal within community, mismatched post/comment identifiers, nonexistent targets, and repeated deletion attempts on already removed comments.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId
 * @accessor api.functional.communityPlatform.member.posts.comments.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target post ID that contains the comment.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment ID to remove from the post.
     */
    commentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("postId")(() => typia.assert(props.postId));
      assert.param("commentId")(() => typia.assert(props.commentId));
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
