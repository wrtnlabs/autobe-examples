import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformPostSnapshot } from "../../../../../api/structures/ICommunityPlatformPostSnapshot";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postCommunityPlatformMemberPostsPostIdSnapshots } from "../../../../../providers/postCommunityPlatformMemberPostsPostIdSnapshots";

@Controller("/communityPlatform/member/posts/:postId/snapshots")
export class CommunityplatformMemberPostsSnapshotsController {
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
   * @param connection
   * @param postId Target post identifier
   * @param body Creation data for the new post snapshot
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as a transactional child-resource creation against `community_platform_post_snapshots` for the parent `community_platform_posts` row identified by `postId`.
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
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformPostSnapshot.ICreate,
  ): Promise<ICommunityPlatformPostSnapshot> {
    try {
      return await postCommunityPlatformMemberPostsPostIdSnapshots({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
