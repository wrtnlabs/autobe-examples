import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentState";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that moderator comment state updates are reflected by the state read
 * endpoint.
 *
 * Business workflow:
 *
 * 1. Register and log in a member user.
 * 2. As the member user, create a community, then a post in that community, then a
 *    comment on that post.
 * 3. Register and log in a community moderator.
 * 4. As the moderator, read the initial comment state via GET
 *    /communityPlatform/communityModerator/comments/{commentId}/state.
 * 5. As the moderator, update the comment state via PUT
 *    /communityPlatform/communityModerator/comments/{commentId}/state using
 *    ICommunityPlatformCommentState.IUpdate.
 * 6. Read the comment state again and verify that visibility_state, lock_state,
 *    collapse_state, moderation_state, and moderation_reason match the update
 *    payload.
 * 7. Verify that updated_at has changed relative to the original state.
 */
export async function test_api_comment_state_reflects_moderation_updates(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As member, create a community
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. As member, create a post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.paragraph({ sentences: 10, wordMin: 3, wordMax: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. As member, create a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Register moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/join/moderator",
    referrer: "https://example.com/landing/moderator",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. As moderator, read initial comment state
  const initialState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.at(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(initialState);

  // 7. Prepare and apply state update
  const updateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const updatedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedState);

  // 8. Re-read the state and validate changes
  const reloadedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.at(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(reloadedState);

  // Field equality validations
  TestValidator.equals(
    "visibility_state should reflect moderation update",
    reloadedState.visibility_state,
    updateBody.visibility_state,
  );
  TestValidator.equals(
    "lock_state should reflect moderation update",
    reloadedState.lock_state,
    updateBody.lock_state,
  );
  TestValidator.equals(
    "collapse_state should reflect moderation update",
    reloadedState.collapse_state,
    updateBody.collapse_state,
  );
  TestValidator.equals(
    "moderation_state should reflect moderation update",
    reloadedState.moderation_state,
    updateBody.moderation_state,
  );
  TestValidator.equals(
    "moderation_reason should reflect moderation update",
    reloadedState.moderation_reason,
    updateBody.moderation_reason,
  );

  // updated_at must change after update
  TestValidator.notEquals(
    "updated_at must change after state update",
    initialState.updated_at,
    reloadedState.updated_at,
  );
}
