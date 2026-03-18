import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformComment } from "../../../../../structures/ICommunityPlatformComment";
import { ICommunityPlatformPostVoteComment } from "../../../../../structures/ICommunityPlatformPostVoteComment";
import { IPageICommunityPlatformPostVoteComment } from "../../../../../structures/IPageICommunityPlatformPostVoteComment";

export * as votes from "./votes/index";

/**
 * Create a new comment in a post’s discussion thread.
 *
 * This operation creates a single row in the `community_platform_comments` table and associates it with exactly one `community_platform_posts` record via the required `community_platform_post_id` foreign key. The request author becomes the `author_id` of the created comment, and the comment’s body is stored in `body_text`. The operation also supports nested reply placement by optionally setting `parent_comment_id` (when provided by the client) to join the comment into a thread within the same post.
 *
 * Security and access control are enforced according to the platform’s ownership rules: only logged-in authenticated members can create posts and comments, and only members who are subscribed to the target community can create posts in that community. The operation must also validate that the target post is a valid viewing/targeting context; if the target post is not available for viewing (e.g., it does not exist or is otherwise not retrievable for normal viewing), the system rejects the comment creation request and does not create any comment.
 *
 * Business rules and validation are applied at creation time:
 * - The `postId` path parameter is used to locate the target `community_platform_posts` row. Comments must be associated with that single post.
 * - The created comment must be authored by exactly one user; the system sets `author_id` from the authenticated member identity.
 * - Nested replies (if `parent_comment_id` is provided) must belong to the same post discussion to avoid cross-post threading.
 * - If the request content would result in invalid displayable state (for example, missing/empty body content), the system rejects the request and keeps the existing thread unchanged.
 *
 * Error handling follows the platform’s general pattern for invalid ownership/eligibility:
 * - If the request violates access boundaries (not logged in, or not subscribed to the post’s community), the system rejects the request.
 * - If the target `postId` does not resolve to a viewable post, the system rejects the request and returns an error without persisting a comment.
 *
 * This operation is typically used together with post viewing operations:
 * - After creating, clients refresh or append the new comment into the post thread display.
 * - Comment list display and sorting behavior (Best/New/Controversial) is handled by comment list retrieval operations; this creation endpoint focuses only on producing the newly created comment record for immediate UI insertion.
 *
 * @param props.connection
 * @param props.postId Target post identifier. The new comment will be associated with this post’s discussion thread.
 * @param props.body Create request payload for a new comment in the target post’s thread.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Service-layer flow for POST /posts/{postId}/comments:
 *
 * 1) Authenticate caller and resolve authenticated member identity as voter/user context.
 * 2) Resolve target post:
 *    - Query `community_platform_posts` by `id = postId`.
 *    - If the post cannot be found for normal viewing context, reject.
 * 3) Enforce subscription eligibility:
 *    - Determine the `community_id` from the post row.
 *    - Verify the authenticated member has an active `community_platform_community_subscriptions` relationship for that `community_id`.
 *    - If not eligible, reject.
 * 4) Create comment:
 *    - Insert into `community_platform_comments` with:
 *      - `community_platform_post_id = postId`
 *      - `author_id = authenticated member id`
 *      - `body_text = request.body_text` (or the request field defined by ICommunityPlatformPostComment.ICreate)
 *      - `parent_comment_id = request.parentCommentId` if present
 *    - Validate nested reply consistency:
 *      - If `parent_comment_id` is provided, load that parent comment and ensure its `community_platform_post_id` equals the target post’s id.
 *      - If mismatch or parent does not belong to the post discussion, reject.
 * 5) Transaction:
 *    - Perform steps 2-4 in a single transaction boundary (or ensure consistency via ordering) so no comment is persisted if validations fail.
 * 6) Response:
 *    - Return the created comment with its persisted fields (timestamps, ids, and parent relation indicators) using the canonical `ICommunityPlatformPostComment` mapping.
 *
 * Edge cases:
 * - If request attempts to create a reply with an invalid `parent_comment_id` for another post, reject.
 * - If required content is missing/invalid for displayability, reject before insert.
 * - If the same request is retried, the system behavior should be deterministic only for valid inserts; if idempotency is not implemented in DTO, treat retries as separate creates unless the implementation provides a unique idempotency key in the request DTO.
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
     * Target post identifier. The new comment will be associated with this post’s discussion thread.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Create request payload for a new comment in the target post’s thread.
     */
    body: ICommunityPlatformPostVoteComment.ICreate;
  };
  export type Body = ICommunityPlatformPostVoteComment.ICreate;
  export type Response = ICommunityPlatformPostVoteComment;

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
  export const random = (): ICommunityPlatformPostVoteComment =>
    typia.random<ICommunityPlatformPostVoteComment>();
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
 * Retrieve a paginated comment thread for a specific post.
 *
 * This operation targets comments stored in `community_platform_comments` and scopes them strictly to the given post by matching `community_platform_post_id`. Each comment includes its authored identity via `author_id`, its content in `body_text`, and timing metadata via `posted_at`, which is used for list ordering and for maintaining consistent nested-reply placement in the thread view. The thread structure is represented by the optional `parent_comment_id`, enabling replies to be nested under their parent comment.
 *
 * Permissions and visibility: viewing comment threads must respect the platform access boundary for content browsing (guests can only view public areas; logged-in members can view content where applicable). This operation does not create/update/delete any records, so ownership-specific constraints (e.g., “only the author can edit/delete”) do not apply here; those constraints apply only to state-changing comment operations.
 *
 * Sorting behavior: the comment thread can be returned in different user-selectable orderings (e.g., Best, New, Controversial). The selected sort must be applied consistently across the entire post comment thread (top-level comments and nested replies) so that the nested reply structure remains appropriate while the overall order matches the chosen criteria.
 *
 * Validation and error handling: if the provided `postId` does not correspond to a post that can be viewed, the system must reject the request with an appropriate error and must not return comments from other posts. If pagination parameters are missing or out of bounds, the system should apply defaults or return a validation error consistent with the service’s list browsing expectations. Deleted comments may be handled according to the comment lifecycle using `deleted_at` and moderation/author attribution fields (`deleted_by_id`) in a way that preserves a consistent user experience for post viewers.
 *
 * Related operations: after retrieving this list, clients typically use additional comment-specific operations (e.g., edit, delete, and vote actions) to modify the discussion and then reload the comment thread to reflect the updated ordering or visibility.
 *
 * @param props.connection
 * @param props.postId Target post ID whose comment thread will be listed.
 * @param props.body List request parameters for filtering, sorting, and paginating the comment thread of the given post.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification List comments for a post with pagination and thread-aware sorting.
 *
 * Implementation steps:
 * 1) Parse `postId` from path and pagination/sorting/filter criteria from request body.
 * 2) Verify the target post exists and is viewable in the current access context.
 * 3) Query `community_platform_comments` where `community_platform_post_id = postId`.
 *    - Exclude or handle records based on `deleted_at` in the same manner as other comment list views (do not leak deleted content if policy disallows it).
 *    - Select necessary columns to build summaries: `id`, `author_id`, `parent_comment_id`, `posted_at`, `body_text` (or a truncated/derived preview depending on DTO definition), and any fields required by the selected ordering.
 * 4) For sorting that depends on votes (e.g., Best/Controversial), compute per-comment vote score using `community_platform_comment_votes` joined by `comment_id` and constrained to non-deleted vote rows (`deleted_at` is null if the system treats deleted votes as removed). Because votes are stored per user per comment with `vote_direction`, compute score as (upvote count - downvote count) per comment.
 * 5) Apply ordering rules:
 *    - Best: highest vote score first.
 *    - New: most recent `posted_at` first.
 *    - Controversial: prioritize comments with many votes but scores close to zero.
 *    Ensure the chosen sort ordering is applied consistently to both top-level comments and nested replies.
 * 6) Preserve thread structure in the returned results:
 *    - Build a nested representation based on `parent_comment_id`.
 *    - When pagination cuts across the thread, paginate in a way compatible with the UI’s expected thread display semantics as defined by list browsing rules.
 * 7) Return `IPageICommunityPlatformPostComment.ISummary` (or the matching paginated summary DTO) containing `pagination` metadata and a `data` array of comment summaries.
 *
 * Edge cases:
 * - If the post has no comments, return an empty `data` with pagination metadata.
 * - If the post is not viewable, return an error.
 * - If `parent_comment_id` references a comment that does not exist in the scoped result set, treat the record as an orphan only if the service policy allows; otherwise error.
 *
 * No write transactions are needed because this operation only reads `community_platform_comments` (and optionally aggregates from `community_platform_comment_votes` for vote-based sorting).
 * @path /communityPlatform/member/posts/:postId/comments
 * @accessor api.functional.communityPlatform.member.posts.comments.index
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
     * Target post ID whose comment thread will be listed.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * List request parameters for filtering, sorting, and paginating the comment thread of the given post.
     */
    body: ICommunityPlatformPostVoteComment.IRequest;
  };
  export type Body = ICommunityPlatformPostVoteComment.IRequest;
  export type Response = IPageICommunityPlatformPostVoteComment.ISummary;

  export const METADATA = {
    method: "PATCH",
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
  export const random = (): IPageICommunityPlatformPostVoteComment.ISummary =>
    typia.random<IPageICommunityPlatformPostVoteComment.ISummary>();
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
 * Retrieve a single comment within a specific post’s comment thread.
 *
 * This endpoint is responsible for returning the exact comment identified by `commentId` only when it is associated with the specified `postId`. The underlying data is stored in `community_platform_comments`, where each record belongs to exactly one `community_platform_posts` via `community_platform_post_id`, and may optionally reference a parent comment via `parent_comment_id` to support nested replies.
 *
 * Security and permissions: this operation must enforce actor-based access boundaries. A guest can view comment content only for posts that are publicly viewable in the community. A member can view the post’s comment thread according to their participation/visibility boundaries. An admin can access administrative/audit contexts; implementation should ensure the returned comment data respects visibility of the comment when `deleted_at` is set.
 *
 * Relationship to database entities: the endpoint is anchored to both `community_platform_posts` (scoped by `postId`) and `community_platform_comments` (scoped by `commentId`). The comment’s authorship is represented by `author_id` and edit/deletion attribution is represented by `edited_by_id` and `deleted_by_id` (nullable). Nested reply structure is represented by `parent_comment_id`, and reply lists are derived from the `replies` relation when rendering a thread, though this endpoint returns only the single comment record.
 *
 * Validation and business rules: the service must verify that the target post exists and that the target comment belongs to that post. If the post does not exist, or if the comment is not associated with the given post, the operation must reject the request (do not leak comment existence across posts).
 *
 * Deleted-content behavior: `community_platform_comments` includes `deleted_at` and `deleted_by_id`. For non-admin viewers, the implementation should ensure deleted comments are not shown as active thread entries (and return behavior should be consistent with the platform’s comment thread deletion expectations). For admin contexts, the endpoint may include deleted metadata based on the DTO capability.
 *
 * Related operations: for rendering the full thread view, clients should use the comment list/search operation (typically `PATCH /posts/{postId}/comments` or an equivalent listing endpoint). For voting and moderation workflows, related endpoints exist for comment upvote/downvote and comment edit/delete, and those operations will affect what this endpoint returns when re-fetched after changes.
 *
 * Error handling: return a clear not-found/invalid-association response when either the post is missing or the comment is not associated with the post. Ensure consistent HTTP status mapping across the API.
 *
 * @param props.connection
 * @param props.postId Target post ID that scopes which comment thread the request is accessing.
 * @param props.commentId Target comment ID within the specified post thread.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1. Parse `postId` and `commentId` from path.
 * 2. Start a read-only transaction.
 * 3. Verify the post exists and is accessible in the caller’s actor context.
 *    - Query `community_platform_posts` by `id = postId`.
 *    - If not found or not accessible, return a not-found/denied style error (consistent with API error policy).
 * 4. Fetch the comment from `community_platform_comments` with both constraints:
 *    - `id = commentId`
 *    - `community_platform_post_id = postId`
 * 5. Enforce deleted-content visibility:
 *    - If `community_platform_comments.deleted_at` is not null:
 *      - For non-admin viewers, do not return the comment as a normal active entry. Return not-found (or the platform’s defined error) so the client behaves like the comment is absent from the thread.
 *      - For admin contexts, return the record data including deletion metadata as permitted by the response DTO.
 * 6. Shape the response DTO for the comment:
 *    - Include core content (`body_text`, `posted_at`), and identity attribution fields (`author_id`, optional `edited_by_id`, optional `deleted_by_id`).
 *    - Include `parent_comment_id` so clients can understand nested reply placement; do not load reply children arrays for this single-resource endpoint unless the DTO explicitly requires it.
 * 7. Return the comment detail.
 *
 * Edge cases:
 * - Comment exists but belongs to a different post: treat as not found to avoid leaking cross-post existence.
 * - Null attribution fields (`edited_by_id`, `deleted_by_id`, `parent_comment_id`) must be returned as nulls according to the DTO contract.
 *
 * Database queries:
 * - Use indexed columns `community_platform_post_id` and primary key `id` to ensure efficient lookup (see indexes on `community_platform_comments`).
 * @path /communityPlatform/member/posts/:postId/comments/:commentId
 * @accessor api.functional.communityPlatform.member.posts.comments.at
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
     * Target post ID that scopes which comment thread the request is accessing.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment ID within the specified post thread.
     */
    commentId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformComment;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}`;
  export const random = (): ICommunityPlatformComment =>
    typia.random<ICommunityPlatformComment>();
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

/**
 * Updates the content of a specific comment within a specific post discussion thread.
 *
 * This operation targets the comment record identified by the combination of the URL parameters `{postId}` and `{commentId}`. In the database, each comment belongs to exactly one post via `community_platform_post_id`, and the comment’s textual content is stored in `body_text`. Updating this endpoint changes what viewers see in the post’s comment thread.
 *
 * Security and authorization boundaries are enforced based on the actor’s identity. Editing a comment is restricted to the comment author for regular members; when the requester is not allowed to edit the comment, the system must reject the operation and must not apply any change.
 *
 * Validation rules include rejecting an update when the resulting comment content would be empty or missing. This ensures the comment remains displayable after editing, consistent with the domain rule that empty or missing comment content must not be accepted.
 *
 * This endpoint does not change the comment’s thread position. After a successful update, the comment must remain associated with the same post and keep its nested reply placement (represented in the database by `parent_comment_id`). The operation only updates the comment’s `body_text` and updates the system timestamps (the database has `updated_at`; attribution fields like `edited_by_id` are set by the service when applicable).
 *
 * Related behavior: after this update succeeds, subsequent reads of the post’s comment thread should display the new `body_text` in the same location in the thread.
 *
 * Error handling: if the target post or comment does not exist, or if the comment does not belong to the specified post, the system rejects the update. If authorization fails or content validation fails (empty body), the system rejects the update and leaves the existing comment unchanged.
 *
 * @param props.connection
 * @param props.postId Target post ID that scopes which comment thread the update applies to.
 * @param props.commentId Target comment ID to update within the specified post.
 * @param props.body Update payload for the comment content.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1) Parse `postId` and `commentId` from path.
 * 2) Load the target comment by `id = commentId` and additionally verify it belongs to `community_platform_post_id = postId`.
 *    - If no row matches, return a not-found style error for the target resource.
 * 3) Authorization:
 *    - Determine requester member identity.
 *    - Compare requester id to the comment’s `author_id`.
 *    - If requester is not the author, reject (no updates applied).
 *    - (Do not allow `edited_by_id`/attribution spoofing; it is set by the service.)
 * 4) Validate request body:
 *    - Ensure the updated comment content (mapped to `body_text`) is present and non-empty.
 *    - If empty or missing, reject the request and do not update.
 * 5) Apply update in a transaction:
 *    - Update `body_text` to the new value.
 *    - Set `updated_at` to current timestamp.
 *    - Set `edited_by_id` to requester member id if the service records it; otherwise keep null (but do not let clients modify it).
 * 6) Return the updated comment entity.
 *
 * Database operations:
 * - Single-row SELECT for ownership verification.
 * - Single-row UPDATE with WHERE `id = commentId` (and optional WHERE `community_platform_post_id = postId` for additional safety).
 *
 * Edge cases:
 * - If concurrent edits occur, last write wins; the response reflects the persisted state.
 * - Nested reply placement is unchanged because `parent_comment_id` is not modified.
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
     * Target post ID that scopes which comment thread the update applies to.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment ID to update within the specified post.
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Update payload for the comment content.
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
 * Permanently removes a specific comment from a specific post discussion.
 *
 * This operation targets the comment identified by `{commentId}` within the post identified by `{postId}` (the comment must belong to that post discussion via the `community_platform_comments.community_platform_post_id` relationship). The underlying `community_platform_comments` table includes `body_text` for the comment content, `posted_at` for ordering, and `deleted_at`/`deleted_by_id` for lifecycle tracking. After successful removal, the comment must no longer be returned by comment-list or thread-view browsing for that post, so the deleted comment does not reappear after a client reload.
 *
 * Security and authorization are enforced based on platform ownership rules: a logged-in member can delete only their own comments (matching `community_platform_comments.author_id`). If the actor is a community moderator, the moderator can delete any comment within that community. If authorization fails (for example, the member is not the comment author and is not a moderator), the operation must reject the request and must not apply any deletion changes.
 *
 * Thread consistency is required: comments participate in nested reply threads through `parent_comment_id` and `replies`. When a comment is removed, the remaining thread structure in the post view must remain coherent (nested replies should not break the display; they must be handled consistently with the platform’s deletion behavior). In addition, the deletion must ensure that subsequent viewing attempts do not expose the deleted comment content or author details.
 *
 * Error handling expectations: if the target comment does not exist within the specified `{postId}`, or if it has already been removed, the operation must reject the request rather than returning success. On successful execution, no additional data is returned; clients should refresh the post’s comments list to observe the updated thread.
 *
 * Related operations: use the post comment reading/listing endpoints (e.g., comment thread retrieval for a post) to obtain the remaining visible comments after deletion. Deleting the author’s account (and its cascade effects on authored posts and comments) follows the account deletion rules defined elsewhere, but that is separate from this per-comment deletion operation.
 *
 * @param props.connection
 * @param props.postId Target post ID that scopes the comment discussion to the correct post.
 * @param props.commentId Target comment ID to be removed from the specified post discussion.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Resolve actor and authorization context
 * - Extract authenticated actor identity from session/middleware.
 * - Determine whether actor is a moderator for the community containing the target post (authorization requires joining from comment -> post -> community and then checking moderator membership).
 *
 * 2) Validate target scope (postId + commentId)
 * - Query `community_platform_comments` where `id = {commentId}` AND `community_platform_post_id = {postId}`.
 * - If no row exists, return an authorization/data error (reject).
 *
 * 3) Authorization rules
 * - If actor is a moderator for the community that owns the post: allow deletion.
 * - Else require `community_platform_comments.author_id = actor.memberId`.
 * - If neither condition holds, reject without modifying any records.
 *
 * 4) Deletion behavior
 * - Perform the deletion action consistent with the comment lifecycle fields in `community_platform_comments`:
 *   - Update `deleted_at` to current timestamp.
 *   - Set `deleted_by_id` to actor member id (if the schema requires attribution; if deleted_by_id allows null, still set when possible).
 * - Ensure the removal is reflected for subsequent reads: any query that lists comments for a post must exclude entries with non-null `deleted_at`.
 *
 * 5) Thread consistency
 * - Ensure nested reply handling is coherent for subsequent comment thread rendering:
 *   - Do not delete unrelated comments.
 *   - The renderer should naturally omit the deleted comment; replies should still be fetchable so the remaining thread can be displayed without dangling visibility.
 *
 * 6) Idempotency / already deleted
 * - If the targeted comment already has `deleted_at` set, reject the deletion request (per requirement: attempting to delete an already deleted comment must be rejected).
 *
 * 7) Transaction and error handling
 * - Execute in a transaction to ensure that authorization checks and the deletion update are consistent.
 * - Return success with no payload on completion.
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
     * Target post ID that scopes the comment discussion to the correct post.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment ID to be removed from the specified post discussion.
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
