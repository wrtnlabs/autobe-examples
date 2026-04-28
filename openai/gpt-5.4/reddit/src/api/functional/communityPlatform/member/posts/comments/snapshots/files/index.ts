import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformCommentSnapshotFile } from "../../../../../../../structures/ICommunityPlatformCommentSnapshotFile";
import { IPageICommunityPlatformCommentSnapshotFile } from "../../../../../../../structures/IPageICommunityPlatformCommentSnapshotFile";

/**
 * Create one or more attachment associations for a specific comment snapshot within a post discussion.
 *
 * This operation adds file linkage records under a historical comment snapshot identified by `snapshotId`, while also validating that the snapshot belongs to the specified comment and that the comment belongs to the specified post. The underlying data model separates current comment content in `community_platform_comments`, point-in-time history in `community_platform_comment_snapshots`, stored attachment metadata in `community_platform_comment_files`, and snapshot-scoped attachment membership in `community_platform_comment_snapshot_files`. That normalization allows a comment's historical revision to preserve the exact attachment set that belonged to that version without duplicating the parent post, author, or comment body fields.
 *
 * Only authenticated members should be allowed to invoke this operation. Guests are not permitted to participate in comment creation flows, and the same participation boundary applies to creating files for comment-related resources. The service must additionally verify that the target comment remains a valid descendant of the given post path, and any community-specific participation restrictions that block comment authoring or management must be enforced before creating attachment records.
 *
 * From a business perspective, this endpoint supports auditability and accurate historical reconstruction of discussion content. Because comment history is append-oriented and snapshot traversal is chronological, clients and downstream moderation or history views can use the returned attachment information to display the exact files that were associated with the selected comment revision. This endpoint is typically used together with comment detail or history retrieval operations that first identify the available snapshot and then submit the file metadata to be attached to that snapshot.
 *
 * Validation must ensure that each uploaded file reference is acceptable according to platform file policies, that the target snapshot exists, and that duplicate snapshot-file associations are not created for the same stored file and snapshot pair. If the post, comment, or snapshot cannot be resolved through the nested path, the request must fail rather than attaching files to an unrelated record. On success, the API returns the created snapshot file representation so the client can immediately refresh the attachment list for that historical comment version.
 *
 * @param props.connection
 * @param props.postId Target post identifier that owns the comment thread
 * @param props.commentId Target comment identifier within the specified post
 * @param props.snapshotId Target historical comment snapshot identifier within the specified comment
 * @param props.body Information required to create file links for the comment snapshot
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Resolve the parent post from
 *   community_platform_posts by id = postId and ensure it exists. 2. Resolve
 *   the parent comment from community_platform_comments by id = commentId and
 *   community_platform_post_id = postId. Reject if not found. 3. Resolve the
 *   target snapshot from community_platform_comment_snapshots by id =
 *   snapshotId and community_platform_comment_id = commentId. Reject if not
 *   found. 4. Authorize the caller as a member. Reject guest callers. If
 *   community participation restrictions on the parent post's community prevent
 *   comment-related authoring or management for this member, reject the
 *   request. 5. Validate the request body payload for required file metadata
 *   fields defined by ICommunityPlatformCommentSnapshotFile.ICreate. For each
 *   requested attachment item, validate original filename, media type, storage
 *   locator, and size against platform file policy rules. 6. In a single
 *   transaction, create or resolve the underlying
 *   community_platform_comment_files record for each attachment item, ensuring
 *   storage_key uniqueness is respected. Then insert
 *   community_platform_comment_snapshot_files rows linked to the resolved
 *   snapshot and each stored file. 7. Before inserting a snapshot-file linkage,
 *   check the unique constraint on [community_platform_comment_snapshot_id,
 *   community_platform_comment_file_id] to prevent duplicate associations. If
 *   the same file is already linked to the snapshot, either reject as a
 *   conflict or skip according to service policy; do not create duplicates. 8.
 *   Persist created_at and updated_at timestamps for new records. Do not modify
 *   unrelated comment, post, or snapshot rows. 9. Return the created snapshot
 *   file resource view including identifiers and normalized file metadata
 *   needed by clients to render the snapshot's attachments. 10. Error handling:
 *   return not found for mismatched or missing post/comment/snapshot nesting;
 *   forbidden for guest or restricted member access; validation failure for
 *   unacceptable file metadata; conflict for uniqueness violations such as
 *   duplicate storage_key or duplicate snapshot-file association.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files
 * @accessor api.functional.communityPlatform.member.posts.comments.snapshots.files.create
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
     * Target post identifier that owns the comment thread
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment identifier within the specified post
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target historical comment snapshot identifier within the specified comment
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Information required to create file links for the comment snapshot
     */
    body: ICommunityPlatformCommentSnapshotFile.ICreate;
  };
  export type Body = ICommunityPlatformCommentSnapshotFile.ICreate;
  export type Response = ICommunityPlatformCommentSnapshotFile;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/files`;
  export const random = (): ICommunityPlatformCommentSnapshotFile =>
    typia.random<ICommunityPlatformCommentSnapshotFile>();
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
      assert.param("commentId")(() => typia.assert(props.commentId));
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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
 * Retrieve a filtered and paginated list of file associations attached to a specific historical comment snapshot within a post discussion.
 *
 * This operation exposes the historical attachment set preserved for one snapshot of a threaded discussion comment. The underlying snapshot model is described in the database schema as a point-in-time historical linkage record for community_platform_comments, and the snapshot-file model preserves which stored comment files were associated with that exact snapshot version. As a result, this endpoint is used to inspect the attachment state of a comment revision exactly as it existed when the snapshot was recorded, rather than the current attachment state of the live comment.
 *
 * The operation is scoped by post, comment, and snapshot identifiers to enforce the content hierarchy defined in the requirements: posts are the root content items of a community discussion, comments belong to posts, and replies remain attached to their parent discussion branch. The service must therefore verify that the specified comment belongs to the specified post and that the specified snapshot belongs to the specified comment before returning any data. This hierarchical validation prevents historical files from being read through an unrelated post or comment path.
 *
 * From an access perspective, this operation supports discussion viewing scenarios for both guests and members because the requirements allow post discussions and comment threads to be viewed publicly. The endpoint returns historical file linkage information only for an existing snapshot context and does not alter discussion state. If the post, comment, or snapshot is unavailable, or if the identifiers do not form a valid ownership chain, the operation must fail rather than returning partial or mismatched historical data.
 *
 * The returned data should be optimized for browsing. The database schema describes community_platform_comment_snapshot_files as normalized association records between a comment snapshot and a stored comment file, with timestamps and an inactive marker on the linkage row. Implementations should therefore return only associations that are active and valid for the targeted snapshot, ordered consistently for stable client rendering. This endpoint may be used together with post detail and comment thread retrieval operations when a client needs to inspect historical comment revisions and the files attached to those revisions.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.commentId Target comment's ID within the post
 * @param props.snapshotId Target historical snapshot's ID for the comment
 * @param props.body Pagination and sorting criteria for comment snapshot files
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Validate that the caller is permitted to read the
 *   parent post discussion according to general discussion visibility rules.
 *   Then load the target comment by id and confirm its
 *   community_platform_post_id matches the supplied postId. Load the target
 *   snapshot by id and confirm its community_platform_comment_id matches the
 *   supplied commentId. If either ownership check fails, return a not-found
 *   style error to avoid disclosing unrelated resource existence.
 *
 * Query community_platform_comment_snapshot_files as the primary collection source filtered by community_platform_comment_snapshot_id = snapshotId and deleted_at IS NULL. Join the related stored comment file record from community_platform_comment_files as needed to populate summary DTO fields required by the response schema. Use a deterministic default ordering for stable pagination; if the request DTO supports sorting, only allow safe sortable fields grounded in actual schema, such as created_at. Apply pagination from the request body and return an IPage container.
 *
 * Do not mutate current comment state or snapshot state during this operation. This endpoint is read-only over append-oriented historical records. If the parent post, comment, or snapshot does not exist, or if the snapshot does not belong to the specified comment, or the comment does not belong to the specified post, fail without returning unrelated snapshot file records. If future authorization rules distinguish private or removed content visibility, enforce them before querying the snapshot file list.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files
 * @accessor api.functional.communityPlatform.member.posts.comments.snapshots.files.index
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
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment's ID within the post
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target historical snapshot's ID for the comment
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Pagination and sorting criteria for comment snapshot files
     */
    body: ICommunityPlatformCommentSnapshotFile.IRequest;
  };
  export type Body = ICommunityPlatformCommentSnapshotFile.IRequest;
  export type Response = IPageICommunityPlatformCommentSnapshotFile.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/files`;
  export const random =
    (): IPageICommunityPlatformCommentSnapshotFile.ISummary =>
      typia.random<IPageICommunityPlatformCommentSnapshotFile.ISummary>();
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
      assert.param("commentId")(() => typia.assert(props.commentId));
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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
 * Retrieve the detailed attachment association for a specific historical comment snapshot within a post discussion.
 *
 * This operation returns one snapshot-scoped attachment linkage record from community_platform_comment_snapshot_files. That table preserves which stored comment files were associated with a specific community_platform_comment_snapshots version so that historical comment revisions retain their exact attachment set even if the current comment attachments later change. In business terms, this endpoint exposes one historical file association for a comment that is part of a post discussion, allowing clients to inspect a precise revision artifact rather than the current mutable comment state.
 *
 * The endpoint is scoped through the post, comment, and snapshot hierarchy because a comment is always part of a specific post discussion and a comment snapshot is a historical child of one canonical comment. The implementation must therefore confirm that the target community_platform_comments row belongs to the specified community_platform_posts row, that the target community_platform_comment_snapshots row belongs to that comment, and that the target community_platform_comment_snapshot_files row belongs to that snapshot. This hierarchical validation is essential to prevent cross-thread or cross-snapshot access using unrelated identifiers.
 *
 * Access to this operation should be limited to actors allowed to read comment-history details in authenticated contexts, such as members and administrators. Although comments are discussion entries whose visible form includes author identity, written content, vote score, and posted time, this endpoint is not a general comment-thread read. Instead, it is a revision-artifact read that depends on an existing comment-history structure. Clients typically reach this resource after first identifying the relevant post discussion and then locating a specific comment snapshot from the comment-history flow.
 *
 * The operation must treat unavailable parents consistently with the platform's deletion and moderation behavior. Requirements state that comments removed after account deletion stop appearing in post threads and that deleted or moderated content becomes unavailable for later actions. For that reason, if the specified post, comment, or snapshot chain cannot be resolved in a valid readable state, the operation should fail as not found rather than exposing orphaned or mismatched historical attachment associations. If a snapshot exists but the requested snapshotFileId does not belong to it, the operation must also fail as not found.
 *
 * This endpoint is complementary to broader post and comment detail APIs. A client would normally obtain the post context first, then identify the target comment within the discussion, and only then request a specific historical snapshot attachment association when rendering revision history or moderation audit details. It is not a substitute for the normal post discussion or comment-thread retrieval endpoints.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.commentId Target comment's ID within the post discussion
 * @param props.snapshotId Target historical comment snapshot's ID
 * @param props.snapshotFileId Target snapshot file association's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service that resolves a single
 *   community_platform_comment_snapshot_files record within its full parent
 *   chain.
 *
 * 1. Validate all path parameters as UUID strings.
 * 2. Query community_platform_comments joined to community_platform_posts to confirm the comment identified by commentId belongs to the post identified by postId.
 * 3. Enforce normal-read visibility rules for the post and comment. If the post or comment is deleted, removed, moderated out of normal visibility, or otherwise unavailable for later actions, return a not-found result.
 * 4. Query community_platform_comment_snapshots by snapshotId and confirm its community_platform_comment_id matches the resolved commentId. If not, return not found.
 * 5. Query community_platform_comment_snapshot_files by snapshotFileId and confirm its community_platform_comment_snapshot_id matches snapshotId. If not, return not found.
 * 6. Return the detailed snapshot-file association DTO. Include the linkage identity and relation fields defined by the response schema, and expose timestamps according to the schema model. Do not invent fields not supported by the generated DTO.
 *
 * Use indexed lookups on primary keys first, then enforce parent-child consistency checks. Prefer a single composed query with joins when practical, or multiple guarded lookups inside one service method when that is clearer. No mutation or transaction is required because this operation is read-only.
 *
 * Error handling: return not found when any parent resource is missing, mismatched, or not readable in normal platform behavior. Return forbidden when the caller lacks permission to inspect comment-history artifacts. Do not silently remap identifiers across different posts, comments, or snapshots.
 *
 * This endpoint should be documented and implemented as a historical artifact lookup, not as current attachment listing. For list retrieval of all snapshot files, use a separate list endpoint rather than overloading this detail operation.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId
 * @accessor api.functional.communityPlatform.member.posts.comments.snapshots.files.at
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
     * Target post's ID
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment's ID within the post discussion
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target historical comment snapshot's ID
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Target snapshot file association's ID
     */
    snapshotFileId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommentSnapshotFile;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/files/${encodeURIComponent(props.snapshotFileId ?? "null")}`;
  export const random = (): ICommunityPlatformCommentSnapshotFile =>
    typia.random<ICommunityPlatformCommentSnapshotFile>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.param("snapshotFileId")(() => typia.assert(props.snapshotFileId));
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
 * Update a historical comment snapshot file association for a specific comment snapshot within a post discussion.
 *
 * This operation modifies one snapshot-scoped attachment linkage record stored in `community_platform_comment_snapshot_files`. That table exists to preserve which stored files from `community_platform_comment_files` were associated with a specific historical comment revision in `community_platform_comment_snapshots`. In business terms, the endpoint manages the exact attachment membership of a historical comment version rather than the current live comment body in `community_platform_comments`. The surrounding path also reflects the discussion hierarchy described in the requirements: comments are written discussion entries attached to posts, replies remain part of the same post discussion, and historical snapshot records are subordinate to their parent comment.
 *
 * From an authorization perspective, this operation is intended for authenticated participation and administrative or moderation-aware service enforcement. Guests are not allowed to perform comment-participation actions, and comment-related write behavior is member-driven in the loaded requirements. The service implementation must therefore validate that the caller is authenticated and is permitted to manage the underlying comment history in the target context before updating the snapshot-file record. If the specified post, comment, snapshot, or snapshot-file resource does not exist in the declared hierarchy, the operation must reject the request instead of updating a record outside the requested scope.
 *
 * The underlying schema comments emphasize that `community_platform_comment_snapshot_files` is a normalized association table whose purpose is to preserve the exact attachment set for a specific snapshot event. Because of that design, this endpoint must treat the resource as a historical linkage artifact rather than as a generic file-upload endpoint. It should not create new binary storage objects by itself, and it should not rewrite the canonical current comment content. Any referenced stored file must already exist as a `community_platform_comment_files` record, and any update must keep the association consistent with its parent snapshot and with the parent comment and post chain.
 *
 * This operation is typically used together with detail retrieval flows for posts and comments when an internal tool, moderation interface, or revision-management feature needs to reconcile historical attachment metadata. Clients should already know the enclosing post, comment, and snapshot identifiers before calling this endpoint. If a consumer needs the current discussion thread or sorted comment list, those concerns belong to the post-comment retrieval operations rather than this snapshot-link update endpoint.
 *
 * Expected failures include attempts to update a snapshot-file association under the wrong parent snapshot, attempts to target comments or posts that are unavailable in normal participation flows, and attempts by unauthorized actors to modify comment-history resources. Successful execution returns the updated snapshot-file association in JSON so downstream clients can continue rendering or auditing the historical attachment set with the corrected linkage state.
 *
 * @param props.connection
 * @param props.postId Target post's ID
 * @param props.commentId Target comment's ID within the post discussion
 * @param props.snapshotId Target historical comment snapshot's ID
 * @param props.snapshotFileId Target snapshot file association's ID
 * @param props.body Updated values for the historical comment snapshot file association
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Validate that the caller is an authenticated member
 *   or another service-authorized privileged actor according to platform
 *   authorization rules. Resolve the nested resource chain in order: load
 *   `community_platform_posts` by `postId`, load `community_platform_comments`
 *   by `commentId` constrained to the resolved post, load
 *   `community_platform_comment_snapshots` by `snapshotId` constrained to the
 *   resolved comment, and finally load
 *   `community_platform_comment_snapshot_files` by `snapshotFileId` constrained
 *   to the resolved snapshot. Reject the request if any parent-child
 *   relationship does not match.
 *
 * Apply update logic only to fields permitted by `ICommunityPlatformCommentSnapshotFile.IUpdate`. Typical permitted mutations for this association resource include changing the linked `community_platform_comment_file_id` to another valid stored file belonging to the same parent comment context, or changing lifecycle-state-related fields represented by the DTO. Never infer writable fields beyond the DTO contract. If the update references another `community_platform_comment_files` record, verify that the referenced file exists, is not incompatible with the comment context, and does not violate the unique constraint on `(community_platform_comment_snapshot_id, community_platform_comment_file_id)`.
 *
 * Execute the update in a transaction. Re-check unique-constraint safety before commit so that the same file is not attached twice to the same snapshot. Update the `updated_at` timestamp as part of persistence behavior. Preserve append-only historical semantics of `community_platform_comment_snapshots`; this endpoint must update only the association row and must not mutate snapshot ownership, create a new snapshot event, or alter the current canonical comment body in `community_platform_comments`.
 *
 * Return the updated `community_platform_comment_snapshot_files` resource after persistence. The response mapper should expose the linkage record as `ICommunityPlatformCommentSnapshotFile`. Error handling should distinguish not found, forbidden, invalid hierarchy, and uniqueness-conflict conditions. If the target post or comment has become unavailable for normal participation, or if the caller lacks permission to manage the historical attachment mapping, the service must fail without partial writes.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId
 * @accessor api.functional.communityPlatform.member.posts.comments.snapshots.files.update
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
     * Target comment's ID within the post discussion
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target historical comment snapshot's ID
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Target snapshot file association's ID
     */
    snapshotFileId: string & tags.Format<"uuid">;

    /**
     * Updated values for the historical comment snapshot file association
     */
    body: ICommunityPlatformCommentSnapshotFile.IUpdate;
  };
  export type Body = ICommunityPlatformCommentSnapshotFile.IUpdate;
  export type Response = ICommunityPlatformCommentSnapshotFile;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/files/${encodeURIComponent(props.snapshotFileId ?? "null")}`;
  export const random = (): ICommunityPlatformCommentSnapshotFile =>
    typia.random<ICommunityPlatformCommentSnapshotFile>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.param("snapshotFileId")(() => typia.assert(props.snapshotFileId));
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
 * Remove a specific file association from a historical comment snapshot.
 *
 * This operation deletes one record from the historical snapshot-scoped attachment linkage set for a comment revision. In the underlying data model, `community_platform_comment_snapshots` is the point-in-time historical anchor for a comment, and `community_platform_comment_snapshot_files` preserves which stored comment files were associated with that specific snapshot version. Deleting this nested resource means the targeted historical snapshot will no longer include the specified attached file association when comment-history data is read later.
 *
 * The endpoint is intentionally deeply nested under post, comment, and snapshot identifiers because the platform's comment history is contextual. A comment belongs to a specific post through `community_platform_comments.community_platform_post_id`, and a snapshot belongs to a specific comment through `community_platform_comment_snapshots.community_platform_comment_id`. The snapshot-file record then belongs to that snapshot through `community_platform_comment_snapshot_files.community_platform_comment_snapshot_id`. The service must therefore verify the full lineage before removing the record so that a client cannot supply a valid `snapshotFileId` from another comment history branch.
 *
 * From a permission perspective, this operation is for authenticated actors with authority over the comment in its community context. The platform requirements allow members to manage their own content and allow moderators or community owners to delete comments within their community as part of moderation workflows. Guests do not have participation or governance authority. If the caller is the original comment author, the operation may be used as part of managing historical comment attachment visibility. If the caller is a moderator or owner acting within the post's community, the operation may be used within moderation or corrective history maintenance for content in that community.
 *
 * The operation affects only the snapshot-to-file association row. It does not directly delete the parent comment, the parent snapshot, the post, or the underlying stored file metadata unless downstream implementation rules separately determine that the underlying stored file has become unreferenced and should be cleaned up. No archive period, delayed removal period, or recovery window is documented in the loaded requirements, so the API documentation should treat this as an immediate removal of the association from active historical linkage reads.
 *
 * Clients typically use this operation after first retrieving the relevant comment or comment history context from related read APIs. That prior read is necessary to discover the correct `postId`, `commentId`, `snapshotId`, and `snapshotFileId` values under the same lineage. If any identifier does not match the parent-child chain, or if the record no longer exists, the service must reject the request rather than removing an unrelated association.
 *
 * @param props.connection
 * @param props.postId Target post's ID that owns the comment history context.
 * @param props.commentId Target comment's ID within the specified post.
 * @param props.snapshotId Target historical comment snapshot's ID within the specified comment.
 * @param props.snapshotFileId Target snapshot-file association ID within the specified comment snapshot.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a deletion service for a single
 *   `community_platform_comment_snapshot_files` row scoped by full hierarchy
 *   validation.
 *
 * 1. Authenticate the caller and require a member-capable identity. Reject guests. Load the target snapshot-file association by `snapshotFileId`.
 * 2. Join or sequentially load the related `community_platform_comment_snapshots`, `community_platform_comments`, and `community_platform_posts` records. Validate all lineage constraints:
 *    - `community_platform_comment_snapshot_files.id = snapshotFileId`
 *    - `community_platform_comment_snapshot_files.community_platform_comment_snapshot_id = snapshotId`
 *    - `community_platform_comment_snapshots.id = snapshotId`
 *    - `community_platform_comment_snapshots.community_platform_comment_id = commentId`
 *    - `community_platform_comments.id = commentId`
 *    - `community_platform_comments.community_platform_post_id = postId`
 *    - `community_platform_posts.id = postId`
 * 3. Authorize the caller. Allow when the caller is the author of `community_platform_comments.community_platform_member_id`. Also allow when the caller has moderation authority for the community that owns the post. Deny all other callers.
 * 4. Remove the target association record. Because the schema includes `deleted_at` on `community_platform_comment_snapshot_files`, implementation may perform a logical removal by setting `deleted_at` and updating `updated_at`, or may physically delete the row if the service's repository conventions for subsidiary snapshot linkage records require hard deletion. In either case, subsequent snapshot-history reads for this snapshot must exclude the removed association.
 * 5. Perform the mutation in a transaction if authorization or cleanup depends on related lookups. If the implementation supports orphan cleanup, optionally check whether the underlying stored comment file record is now unreferenced by any active snapshot or current comment attachment relation before scheduling separate cleanup; do not couple success of this endpoint to destructive cleanup of the underlying file metadata.
 * 6. Return success with no response body.
 *
 * Error handling:
 * - Return not found when any path identifier does not exist or the hierarchical chain does not match exactly.
 * - Return forbidden when the authenticated actor lacks authorship or moderation authority in the post's community.
 * - Return conflict or equivalent domain error if repository rules prevent removal due to integrity constraints.
 * - Make the operation idempotent only to the extent supported by service conventions; once the association is already removed, subsequent requests should not recreate or mutate other history records.
 * @path /communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId
 * @accessor api.functional.communityPlatform.member.posts.comments.snapshots.files.erase
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
     * Target post's ID that owns the comment history context.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Target comment's ID within the specified post.
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Target historical comment snapshot's ID within the specified comment.
     */
    snapshotId: string & tags.Format<"uuid">;

    /**
     * Target snapshot-file association ID within the specified comment snapshot.
     */
    snapshotFileId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/posts/:postId/comments/:commentId/snapshots/:snapshotId/files/:snapshotFileId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/comments/${encodeURIComponent(props.commentId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}/files/${encodeURIComponent(props.snapshotFileId ?? "null")}`;
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
      assert.param("snapshotFileId")(() => typia.assert(props.snapshotFileId));
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
