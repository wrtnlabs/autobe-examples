import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformCommentVote } from "../../../../../structures/ICommunityPlatformCommentVote";
import { IPageICommunityPlatformCommentVote } from "../../../../../structures/IPageICommunityPlatformCommentVote";

/**
 * Create or replace the authenticated member's current vote on a specific comment.
 *
 * This operation records a member reaction for one discussion entry in the threaded comment system backed by `community_platform_comments` and `community_platform_comment_votes`. The target `commentId` identifies the comment that received the reaction, and the request body supplies the desired directional stance. The vote record preserves the current normalized reaction for exactly one member and one comment pair, allowing the platform to derive visible comment score changes and author karma effects from the active vote state rather than from manual score editing.
 *
 * Access to this operation is limited to authenticated members. Guests may browse public discussions, but voting is a participation feature tied to `community_platform_members`, and the stored vote row always references a member account through `community_platform_comment_votes.community_platform_member_id`. The operation must therefore resolve the acting member from authentication context and must not accept a member identifier from the client. The service should also confirm that the target comment exists and is available for participation within its post discussion context before storing the vote.
 *
 * The operation is closely related to the comment discussion hierarchy described by `community_platform_comments`, where each comment belongs to one post, may optionally belong to a parent comment, and can have child comments in nested reply branches. Although the vote is attached only to the addressed comment, its outcome affects discussion presentation because comment sorting by best, new, and controversial depends on current vote activity and score-derived ordering. In addition, the business rules require comment vote score to remain separate from the post's score, so this operation must update only comment-related aggregates and author karma effects.
 *
 * If the authenticated member has not previously voted on the target comment, the service creates a new current vote record. If a current vote already exists for the same member-comment pair, the service should treat the request as replacing the prior stance so that the latest active vote becomes canonical, consistent with the table-level uniqueness constraint on member and comment. The operation should reject requests for non-existent or unavailable comments and should return the resulting vote resource that represents the member's current reaction after the write completes.
 *
 * @param props.connection
 * @param props.commentId Identifier of the target comment that receives the vote
 * @param props.body The desired vote direction for the target comment
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Resolve the authenticated actor as a member and
 *   reject unauthenticated or guest callers before any write logic.
 *
 * Load the target record from `community_platform_comments` by `commentId`. Reject the request when the comment does not exist, is not available for participation, or is attached to a post context that should not accept interaction. Use the loaded comment to retain discussion integrity and, when needed, join to `community_platform_posts` to verify the enclosing post still exists and is in a valid participation state.
 *
 * Validate the request body against the `ICommunityPlatformCommentVote.ICreate` schema. Persist only fields that are actually represented by `community_platform_comment_votes`, especially the directional stance. Do not accept `community_platform_member_id` or `community_platform_comment_id` from the body because the member comes from authentication context and the comment comes from the path parameter.
 *
 * Within a transaction, query `community_platform_comment_votes` for an existing active record matching the composite unique pair (`community_platform_member_id`, `community_platform_comment_id`). If none exists, insert a new row with a generated UUID, the acting member ID, the target comment ID, the requested direction, and current timestamps. If a row exists, update its `direction`, clear any removal state if the implementation treats replacement as reactivation, and refresh `updated_at` so the single current vote remains canonical. Respect the unique constraint and ensure concurrent requests cannot create duplicate member-comment vote rows.
 *
 * After persistence, recalculate any derived comment score and author karma effects from the current active vote set for the comment, keeping comment score separate from post score as required by business rules. Return the resulting `community_platform_comment_votes` record mapped to `ICommunityPlatformCommentVote`. Reject invalid direction values, missing target comments, unauthorized callers, and any state that makes the comment unavailable for voting.
 * @path /communityPlatform/member/comments/:commentId/votes
 * @accessor api.functional.communityPlatform.member.comments.votes.create
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
     * Identifier of the target comment that receives the vote
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * The desired vote direction for the target comment
     */
    body: ICommunityPlatformCommentVote.ICreate;
  };
  export type Body = ICommunityPlatformCommentVote.ICreate;
  export type Response = ICommunityPlatformCommentVote;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/comments/:commentId/votes",
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
    `/communityPlatform/member/comments/${encodeURIComponent(props.commentId ?? "null")}/votes`;
  export const random = (): ICommunityPlatformCommentVote =>
    typia.random<ICommunityPlatformCommentVote>();
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
 * Retrieve a paginated list of vote records recorded for a specific discussion comment.
 *
 * This operation returns the current vote relationships stored in the community_platform_comment_votes table for one target record in community_platform_comments. Each returned item represents one authenticated member's current vote stance on the selected comment and exposes the normalized vote state used by the platform to derive comment score changes and karma effects. The endpoint is scoped to a single comment so clients can inspect vote activity for that discussion entry without mixing results from other comments or posts.
 *
 * The underlying comment entity is a threaded discussion record that belongs to a post, belongs to an authoring member, and may also belong to a parent comment when it is a reply. The related vote entity stores only the current normalized reaction for a member-comment pair and intentionally does not duplicate aggregate scoring data, post data, community data, or profile data. This separation is important because the visible comment score is derived from the balance of positive and negative votes, while the author's platform-wide karma is affected by the latest active vote state on that comment. Consumers should therefore use this operation when they need raw vote records, and use comment-detail or comment-thread retrieval endpoints when they need the rendered score or the surrounding discussion structure.
 *
 * Access to this operation should be restricted to authenticated actors with a legitimate reason to inspect vote records, such as members operating within authenticated product surfaces or administrators performing review and support tasks. Guests may browse public comments and comment ordering in discussion views, but the loaded requirements do not establish a guest-facing need to enumerate raw member vote records. The operation must also validate that the target comment exists and is addressable by its UUID before performing the vote query.
 *
 * The response is designed for list browsing rather than mutation. It should support pagination and deterministic ordering so large vote sets can be explored reliably. If sort options are exposed in the request body, they should order results using stable persisted fields such as created_at or updated_at from community_platform_comment_votes, not recomputed aggregate score fields that do not belong to the vote record itself. If logically removed vote records are excluded from normal browsing, the implementation should omit rows whose deleted_at is populated unless an internal-only filter explicitly requests otherwise.
 *
 * This endpoint may be used together with the comment-thread retrieval API that shows comments sorted by Best, New, or Controversial. That discussion endpoint is the correct source for user-facing ordering of comments within a post, while the current endpoint is for browsing the underlying vote records for one already identified comment. A client typically obtains the target comment identifier from a post discussion API first, then calls this endpoint when deeper inspection of voting history or current vote stances is required.
 *
 * @param props.connection
 * @param props.commentId Target comment identifier
 * @param props.body Paging, filtering, and sorting options for comment vote records
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Validate that commentId is a valid UUID and load the
 *   target row from community_platform_comments by id. If the comment does not
 *   exist, return a not-found error.
 *
 * Authorize the caller as an authenticated member or admin according to service policy. Reject unauthenticated access. If the service applies additional visibility rules for moderated or removed comments, evaluate those rules before exposing vote records.
 *
 * Query community_platform_comment_votes filtered by community_platform_comment_id = :commentId. Build the query from ICommunityPlatformCommentVote.IRequest to support pagination, optional inclusion or exclusion of logically removed vote rows, optional filtering by direction, and stable sorting over persisted columns such as created_at or updated_at. Default behavior should exclude rows where deleted_at is not null from ordinary browsing unless an internal-use filter explicitly includes them.
 *
 * Use the composite uniqueness of [community_platform_member_id, community_platform_comment_id] as a domain guarantee that at most one current vote row exists per member for the scoped comment. Do not attempt to aggregate or recalculate comment score inside this endpoint beyond optional metadata if such metadata is part of the shared response schema; authoritative score and karma effects are derived by separate application logic based on active votes.
 *
 * Return a paginated collection response containing vote records for the target comment. Ensure ordering is deterministic by appending id as a tiebreaker when necessary. Include standard list metadata in the page wrapper. Handle empty result sets successfully with an empty page. Surface validation errors for unsupported filter values or sort keys and return forbidden when the caller lacks permission to inspect raw vote records.
 * @path /communityPlatform/member/comments/:commentId/votes
 * @accessor api.functional.communityPlatform.member.comments.votes.index
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
     * Target comment identifier
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Paging, filtering, and sorting options for comment vote records
     */
    body: ICommunityPlatformCommentVote.IRequest;
  };
  export type Body = ICommunityPlatformCommentVote.IRequest;
  export type Response = IPageICommunityPlatformCommentVote;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/comments/:commentId/votes",
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
    `/communityPlatform/member/comments/${encodeURIComponent(props.commentId ?? "null")}/votes`;
  export const random = (): IPageICommunityPlatformCommentVote =>
    typia.random<IPageICommunityPlatformCommentVote>();
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
 * Retrieve a single recorded vote on a specific discussion comment.
 *
 * This operation returns the current normalized vote record stored in `community_platform_comment_votes` for the specified `commentVoteId` within the context of the parent comment identified by `commentId`. The returned resource represents one member's current vote stance on one comment, including the directional reaction and the audit timestamps used to track when the vote was created and last changed. As described by the database schema, this table stores only the current vote record and does not duplicate aggregate score data, comment content, post information, community information, or author profile data.
 *
 * The parent-child route structure reflects the underlying content hierarchy described in the requirements: comments belong to post discussions, and comment votes attach to individual comments. The loaded business rules further establish that comment votes influence the visible score of the targeted comment and also affect the comment author's platform-wide karma. Even so, this endpoint is not an aggregation endpoint. It retrieves the raw vote record itself rather than recalculating or returning the comment score or the author's karma totals.
 *
 * From an authorization and privacy perspective, this operation should be treated as access to member-owned reaction data rather than public discussion content. The data ownership rules state that votes belong to the user who cast them and affect the visible vote score and the author's karma according to voting rules. Therefore, implementations should restrict access to authenticated actors with a legitimate reason to inspect the vote record, such as the owning member or privileged administrative actors, and should reject attempts to access a vote that does not belong to the specified comment context.
 *
 * This endpoint is typically used together with comment discussion retrieval APIs. A client would ordinarily load the post discussion and its comment thread first, then use this endpoint when it needs the exact stored vote record for a known comment vote identifier, such as after obtaining vote identifiers from a member-specific discussion view. If the specified vote does not exist, has been removed from active participation through the record lifecycle represented by `deleted_at`, or is not associated with the provided parent comment, the operation must fail rather than returning mismatched data.
 *
 * @param props.connection
 * @param props.commentId Target comment's unique identifier
 * @param props.commentVoteId Target comment vote's unique identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Load the target row from
 *   `community_platform_comment_votes` by `id = :commentVoteId` and verify that
 *   `community_platform_comment_id = :commentId` before returning any data. If
 *   no row matches both identifiers, return a not-found error.
 *
 * Apply authorization before returning the resource. The service should require an authenticated actor. For member access, allow retrieval only when the vote belongs to the authenticated member unless broader read permission is explicitly granted by platform policy. For admin access, allow inspection for support, abuse review, or governance purposes. Guests must be rejected.
 *
 * When querying, return the canonical vote fields from `community_platform_comment_votes`: `id`, `community_platform_member_id`, `community_platform_comment_id`, `direction`, `created_at`, `updated_at`, and `deleted_at`, mapped to the `ICommunityPlatformCommentVote` DTO. Do not derive or embed aggregate comment score, post score, karma totals, or unrelated comment/post payloads in this endpoint.
 *
 * Validate route consistency strictly. The implementation must not return a vote row when the supplied `commentVoteId` exists but belongs to a different comment than `commentId`. This avoids cross-resource leakage and preserves nested resource semantics.
 *
 * If product policy treats `deleted_at` as removed-from-normal-view state, the service should either exclude deleted vote rows from normal member reads or surface them only to privileged actors according to authorization policy. In either case, behavior must be consistent and explicit in service logic. The operation itself remains read-only and must not recalculate score or karma; those are maintained elsewhere according to the comment vote business rules.
 * @path /communityPlatform/member/comments/:commentId/votes/:commentVoteId
 * @accessor api.functional.communityPlatform.member.comments.votes.at
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
     * Target comment's unique identifier
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target comment vote's unique identifier
     */
    commentVoteId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommentVote;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/comments/:commentId/votes/:commentVoteId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/comments/${encodeURIComponent(props.commentId ?? "null")}/votes/${encodeURIComponent(props.commentVoteId ?? "null")}`;
  export const random = (): ICommunityPlatformCommentVote =>
    typia.random<ICommunityPlatformCommentVote>();
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
      assert.param("commentId")(() => typia.assert(props.commentId));
      assert.param("commentVoteId")(() => typia.assert(props.commentVoteId));
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
 * Update the active vote direction for a specific comment vote record belonging to the authenticated member.
 *
 * This operation manages the current normalized reaction stored in the community_platform_comment_votes table, which exists to preserve one member's current vote stance on one specific comment. The path is scoped by both the target comment and the vote record so the system can verify that the supplied vote resource actually belongs to the supplied comment resource before any change is applied. The update changes the direction field of the existing vote record, such as replacing an upvote with a downvote or replacing a downvote with an upvote.
 *
 * Only authenticated members may use this operation because comment voting is a member participation feature. The operation must reject any attempt by a guest to update comment voting state. It must also reject attempts to update a vote for a comment that is no longer available for normal participation, because comment participation rules require the target comment to exist and remain available at the moment of submission. The implementation should further verify that the vote record belongs to the authenticated member, preventing one member from changing another member's recorded reaction.
 *
 * The underlying data relationship is defined by community_platform_comment_votes, which links a member from community_platform_members to a comment from community_platform_comments and stores the raw direction value used to derive visible discussion outcomes. The target comment is part of a threaded discussion structure under a post, and the vote record does not duplicate aggregate score or author data. Instead, when the direction changes, the service must recalculate the affected comment's visible score from active votes and adjust the comment author's karma so it reflects only the latest active vote state.
 *
 * This operation is closely related to the create and removal workflows for comment voting. Clients typically use comment detail or post discussion retrieval operations first to determine the current voting state shown to the member, then call this update operation when the member switches from one active direction to the opposite direction. If the member intends to clear the vote entirely rather than replace it, the corresponding vote removal operation should be used instead. Error handling should cover missing or mismatched comment and vote identifiers, non-member access, unavailable target comments, and attempts to update a vote resource that is not owned by the current member.
 *
 * @param props.connection
 * @param props.commentId Target comment's ID
 * @param props.commentVoteId Target comment vote's ID
 * @param props.body Replacement direction for the active comment vote
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Load the authenticated member identity from the
 *   session context and require the actor to be a member.
 *
 * Within a transaction, load the comment from community_platform_comments by commentId and reject the request if no record exists, if deleted_at is not null, or if the comment status indicates it is not available for normal participation. Load the vote record from community_platform_comment_votes by commentVoteId and reject if no active record exists, if deleted_at is not null, or if its community_platform_comment_id does not equal the supplied commentId. Enforce ownership by rejecting the request unless community_platform_member_id on the vote record equals the authenticated member's id.
 *
 * Validate that the request body provides a supported direction value representing an active vote state. If the requested direction is the same as the current direction, return the current vote resource unchanged or treat it as an idempotent update without double-applying side effects. If the direction changes, update the direction field and updated_at timestamp on community_platform_comment_votes.
 *
 * After persisting the direction change, recalculate the target comment's effective vote score from the current active votes for that comment using the rule total upvotes minus total downvotes. Recalculate the comment author's karma impact so the prior direction's effect is reversed and the new direction's effect is applied, ensuring only the latest active vote state from this member counts toward the author's karma. If karma is stored outside the loaded schemas, call the relevant domain service responsible for member karma consistency instead of duplicating the logic here.
 *
 * Return the updated comment vote resource. Handle failures for unauthorized access, missing comment, missing vote, mismatched path relationship between vote and comment, unavailable comment target, and forbidden cross-member vote updates.
 * @path /communityPlatform/member/comments/:commentId/votes/:commentVoteId
 * @accessor api.functional.communityPlatform.member.comments.votes.update
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
     * Target comment's ID
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target comment vote's ID
     */
    commentVoteId: string & tags.Format<"uuid">;

    /**
     * Replacement direction for the active comment vote
     */
    body: ICommunityPlatformCommentVote.IUpdate;
  };
  export type Body = ICommunityPlatformCommentVote.IUpdate;
  export type Response = ICommunityPlatformCommentVote;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/comments/:commentId/votes/:commentVoteId",
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
    `/communityPlatform/member/comments/${encodeURIComponent(props.commentId ?? "null")}/votes/${encodeURIComponent(props.commentVoteId ?? "null")}`;
  export const random = (): ICommunityPlatformCommentVote =>
    typia.random<ICommunityPlatformCommentVote>();
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
      assert.param("commentId")(() => typia.assert(props.commentId));
      assert.param("commentVoteId")(() => typia.assert(props.commentVoteId));
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
 * Remove a member's current vote from a specific discussion comment.
 *
 * This operation permanently removes the current reaction record stored in the comment vote domain for the specified comment and vote identifiers. The underlying vote record in `community_platform_comment_votes` represents one member's current vote stance on one comment, preserving the raw directional reaction needed to derive visible comment score changes and karma effects in application logic. Deleting that record returns the member-comment pair to the no-vote state described in the vote lifecycle, so the comment is no longer considered upvoted or downvoted by that member.
 *
 * The target comment is the canonical discussion entry stored in `community_platform_comments`, which belongs to a post conversation and may also participate in a reply tree through its optional parent relationship. Because comment votes are attached to comments rather than directly to posts, this endpoint must confirm that `{commentVoteId}` belongs to the `{commentId}` path segment before removing anything. This parent-child validation protects the hierarchical API contract and prevents a vote record for one comment from being manipulated through another comment's route.
 *
 * Security for this operation is member-scoped. Vote records are authored reactions linked to authenticated members, and guests are limited to browsing public content rather than participating in voting. The implementation must therefore require an authenticated member session and verify that the targeted `community_platform_comment_votes` row belongs to the current member. The available moderation requirements authorize moderators and owners to delete posts and comments within their communities, but they do not define moderator authority to remove other users' votes, so this endpoint should not be used for cross-user vote administration.
 *
 * This operation works together with the corresponding vote-creation and vote-update flows that establish or change a member's stance on a comment. After a successful deletion, clients should treat the vote as absent and refresh any displayed score or member-specific reaction state using the relevant comment or comment-list retrieval APIs. If the comment does not exist, the vote does not exist, the vote is not attached to the specified comment, or the vote belongs to another member, the request must be rejected without altering stored reaction data.
 *
 * @param props.connection
 * @param props.commentId Target comment's unique identifier.
 * @param props.commentVoteId Target comment vote's unique identifier.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and obtain the
 *   current member identifier from the session context.
 *
 * Load the target comment from community_platform_comments by id = {commentId}. Reject the request if no comment exists. The comment record is the canonical discussion entity attached to a post and is required to validate the nested route context.
 *
 * Load the target vote from community_platform_comment_votes by id = {commentVoteId}. Reject the request if no vote exists. Validate that vote.community_platform_comment_id equals {commentId}; if not, reject because the child vote does not belong to the comment identified by the route.
 *
 * Validate ownership by checking that vote.community_platform_member_id equals the authenticated member id. Reject the request when a member attempts to remove another member's vote. Do not grant moderator override here because the available requirements only define moderator deletion powers for posts and comments, not for votes.
 *
 * Delete the vote record from community_platform_comment_votes. Because the schema includes deleted_at with a description indicating removal timing if applicable, implementation may either physically delete the row or mark deleted_at according to the service's established deletion strategy, but the externally observable result must be that the member has no current vote on the comment.
 *
 * Within the same transaction, update any derived aggregates required by the service layer, such as recalculated comment score and affected author karma, based on the removed direction value. Ensure concurrent duplicate removals are handled safely by rejecting when the target vote no longer exists at deletion time.
 *
 * Return success with no response body. Log the operation for auditability if the service uses application-level audit logging, and make sure no unrelated comment, post, or member data is modified.
 * @path /communityPlatform/member/comments/:commentId/votes/:commentVoteId
 * @accessor api.functional.communityPlatform.member.comments.votes.erase
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
     * Target comment's unique identifier.
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target comment vote's unique identifier.
     */
    commentVoteId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/comments/:commentId/votes/:commentVoteId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/comments/${encodeURIComponent(props.commentId ?? "null")}/votes/${encodeURIComponent(props.commentVoteId ?? "null")}`;
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
      assert.param("commentId")(() => typia.assert(props.commentId));
      assert.param("commentVoteId")(() => typia.assert(props.commentVoteId));
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
