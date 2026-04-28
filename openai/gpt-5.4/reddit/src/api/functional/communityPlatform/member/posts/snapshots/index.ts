import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformPostSnapshot } from "../../../../../structures/ICommunityPlatformPostSnapshot";

/**
 * Create a new historical snapshot record for a specific post.
 *
 * This operation writes an immutable revision entry beneath an existing post so the platform can preserve point-in-time post state for edit history, deletion transitions, and recovery-oriented review. The parent post is the top-level community content item stored in `community_platform_posts`, which carries the shared identity, authorship, community placement, content-type classification, and current lifecycle state of each post. The created child record is stored in `community_platform_post_snapshots`, the snapshot table that preserves ordered historical records of posts and captures the post's lifecycle visibility state at the moment of recording.
 *
 * The endpoint is scoped to one parent post identified by `postId`. Because `community_platform_post_snapshots` belongs to exactly one `community_platform_posts` row and uses a one-to-many history structure with a monotonic `revision_no`, the server must validate that the target post exists before creating the snapshot. This endpoint is intended for authenticated platform workflows that need to record post history when a member edits a post, when a member deletes a post they created, or when moderation removes a post within community governance flows. Guests must not be allowed to invoke this history-writing behavior.
 *
 * The snapshot record captures the historical visibility state of the post at the time of creation, such as active, deleted, or restored, matching the snapshot schema comment that describes preservation of post-level state at specific moments. Since posts remain visible in feeds and direct views until deleted by their author or removed through moderation, this endpoint supports that lifecycle by retaining a durable history trail that can be replayed in revision order. The operation complements post update and removal APIs rather than replacing them; callers should first determine the business action on the parent post, then create the corresponding snapshot as part of the same mutation workflow so the stored history remains consistent with the current post state.
 *
 * Validation must ensure that the supplied snapshot payload is consistent with the parent post and with the history model. The parent relationship must be derived from the path parameter, not trusted from arbitrary client context, and the server should reject creation when the target post is unavailable. The server should also prevent conflicting revision numbers and guarantee that the new snapshot becomes the next ordered revision for that post. On success, the response returns the created snapshot resource so downstream workflows can reference the recorded revision immediately.
 *
 * @param props.connection
 * @param props.postId Target post identifier
 * @param props.body Creation data for the new post snapshot
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a transactional
 *   child-resource creation against `community_platform_post_snapshots` for the
 *   parent `community_platform_posts` row identified by `postId`.
 *
 * 1. Authorize the caller as an authenticated actor permitted to write post history. This should normally be limited to internal application flows triggered by post edit, author deletion, restoration, or moderation actions; reject unauthenticated callers.
 * 2. Load the parent post from `community_platform_posts` by `id = postId`. If no active parent row exists for the supplied identifier, fail with a not-found error. Use the parent row as the authoritative source of scope.
 * 3. Determine the next `revision_no` by querying the maximum existing revision for `community_platform_post_id = postId` in `community_platform_post_snapshots` and incrementing it by one. Because the schema has a unique constraint on `[community_platform_post_id, revision_no]`, this computation and insert must occur in the same transaction. If concurrent creation causes a unique conflict, retry or fail with a conflict error according to service conventions.
 * 4. Validate the request payload for allowed historical state values before insert. Persist `community_platform_post_id` from the path parameter, store the computed `revision_no`, copy the requested `visibility_state`, and set `created_at` to the current timestamp if the persistence layer does not do so automatically.
 * 5. Insert the new snapshot row and return the created record.
 *
 * Business rules: snapshots are immutable historical records and must not modify the parent post directly. The endpoint should be used together with post-changing operations so that history creation and parent mutation can be coordinated in a higher-level transaction when required. Preserve strict ordering of revision numbers per post. Do not allow the request body to redefine the parent post scope independently of the path parameter.
 *
 * Error handling: return not-found when `postId` does not correspond to an existing post, forbidden/unauthorized when the caller lacks permission to write history, validation failure for invalid `visibility_state`, and conflict when concurrent snapshot creation prevents safe allocation of the next revision number.
 * @path /communityPlatform/member/posts/:postId/snapshots
 * @accessor api.functional.communityPlatform.member.posts.snapshots.create
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
     * Creation data for the new post snapshot
     */
    body: ICommunityPlatformPostSnapshot.ICreate;
  };
  export type Body = ICommunityPlatformPostSnapshot.ICreate;
  export type Response = ICommunityPlatformPostSnapshot;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/posts/:postId/snapshots",
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
    `/communityPlatform/member/posts/${encodeURIComponent(props.postId ?? "null")}/snapshots`;
  export const random = (): ICommunityPlatformPostSnapshot =>
    typia.random<ICommunityPlatformPostSnapshot>();
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
