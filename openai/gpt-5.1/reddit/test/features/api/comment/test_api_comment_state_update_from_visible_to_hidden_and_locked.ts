import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentState";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate comment state lifecycle transitions from visible/unlocked to
 * hidden/locked.
 *
 * This test verifies that a community moderator can manage moderation and
 * lifecycle state on a single comment using the PUT
 * /communityPlatform/communityModerator/comments/{commentId}/state endpoint.
 *
 * Business flow covered:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a community visibility level (e.g., "public").
 * 3. Platform admin creates a simple text post type.
 * 4. Member user joins and logs in.
 * 5. Member user creates a community using the created visibility level.
 * 6. Member user creates a text post in that community.
 * 7. Member user creates a comment on the post.
 * 8. Community moderator joins and logs in.
 * 9. Moderator initializes the comment state to a normal, visible configuration.
 * 10. Moderator updates the comment state to a hidden and locked configuration with
 *     a policy-violation moderation state and explanation.
 * 11. The final state response is asserted to have the new values, including
 *     persisted moderation_reason.
 */
export async function test_api_comment_state_update_from_visible_to_hidden_and_locked(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `member+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: "Test Community for Comment State",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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

  // 6. Member user creates a post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Visibility and Lock State Test Post",
    body: RandomGenerator.paragraph({ sentences: 12 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member user creates a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 8. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `moderator+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 9. Moderator sets baseline normal comment state
  const initialStateBody = {
    visibility_state: "visible",
    lock_state: "unlocked",
    collapse_state: "expanded",
    moderation_state: "none",
    moderation_reason: null,
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const initialState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: initialStateBody,
      },
    );
  typia.assert(initialState);

  TestValidator.equals(
    "initial state matches baseline visible/unlocked configuration",
    initialState.visibility_state,
    initialStateBody.visibility_state,
  );
  TestValidator.equals(
    "initial lock_state is unlocked",
    initialState.lock_state,
    initialStateBody.lock_state,
  );
  TestValidator.equals(
    "initial collapse_state is expanded",
    initialState.collapse_state,
    initialStateBody.collapse_state,
  );
  TestValidator.equals(
    "initial moderation_state is none",
    initialState.moderation_state,
    initialStateBody.moderation_state,
  );
  TestValidator.equals(
    "initial moderation_reason is null",
    initialState.moderation_reason ?? null,
    null,
  );

  // 10. Moderator escalates the comment to hidden/locked for policy violation
  const escalationStateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason:
      "Removed due to violation of community guidelines: hate speech and targeted harassment.",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const escalatedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: escalationStateBody,
      },
    );
  typia.assert(escalatedState);

  // 11. Validate that the escalated state matches the requested configuration
  TestValidator.equals(
    "escalated visibility_state should be soft_removed",
    escalatedState.visibility_state,
    escalationStateBody.visibility_state,
  );
  TestValidator.equals(
    "escalated lock_state should be locked_replies",
    escalatedState.lock_state,
    escalationStateBody.lock_state,
  );
  TestValidator.equals(
    "escalated collapse_state should be collapsed",
    escalatedState.collapse_state,
    escalationStateBody.collapse_state,
  );
  TestValidator.equals(
    "escalated moderation_state should be removed_policy_violation",
    escalatedState.moderation_state,
    escalationStateBody.moderation_state,
  );
  TestValidator.equals(
    "escalated moderation_reason should be stored",
    escalatedState.moderation_reason,
    escalationStateBody.moderation_reason,
  );

  // 12. Optional: ensure that a subsequent update can clear or adjust state without error
  const adjustmentStateBody = {
    visibility_state: "visible",
    lock_state: "unlocked",
    collapse_state: "expanded",
    moderation_state: "none",
    moderation_reason: null,
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const adjustedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: adjustmentStateBody,
      },
    );
  typia.assert(adjustedState);

  TestValidator.equals(
    "adjusted visibility_state returns to visible",
    adjustedState.visibility_state,
    adjustmentStateBody.visibility_state,
  );
  TestValidator.equals(
    "adjusted lock_state returns to unlocked",
    adjustedState.lock_state,
    adjustmentStateBody.lock_state,
  );
  TestValidator.equals(
    "adjusted collapse_state returns to expanded",
    adjustedState.collapse_state,
    adjustmentStateBody.collapse_state,
  );
  TestValidator.equals(
    "adjusted moderation_state returns to none",
    adjustedState.moderation_state,
    adjustmentStateBody.moderation_state,
  );
  TestValidator.equals(
    "adjusted moderation_reason cleared to null",
    adjustedState.moderation_reason ?? null,
    null,
  );
}
