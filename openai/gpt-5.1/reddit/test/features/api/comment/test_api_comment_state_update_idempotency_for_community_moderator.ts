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
 * Verify idempotent behavior of community moderator comment state updates.
 *
 * This test simulates a realistic moderation workflow spanning multiple
 * platform actors and resources, then focuses on idempotency of the
 * comment-state update endpoint used by community moderators.
 *
 * Business steps:
 *
 * 1. A platform admin registers and is implicitly authenticated.
 * 2. The platform admin creates a community visibility level that will be used
 *    when member users create communities.
 * 3. The platform admin creates a basic text post type.
 * 4. A member user registers and is authenticated.
 * 5. Using the member user context, a community is created referencing the created
 *    visibility level.
 * 6. The same member user creates a text post in that community using the created
 *    post type.
 * 7. The member user creates a top-level comment under that post.
 * 8. A community moderator registers and is authenticated.
 * 9. Using the moderator context, the comment state is updated via PUT
 *    /communityPlatform/communityModerator/comments/{commentId}/state with a
 *    well-defined combination of fields (e.g., visibility_state "visible",
 *    lock_state "unlocked", collapse_state "expanded", moderation_state "none",
 *    and moderation_reason null).
 * 10. The test captures the first response (state1).
 * 11. The same endpoint is called again with an identical request body, capturing
 *     the second response (state2).
 * 12. The test asserts that state1 and state2 share identical domain properties and
 *     that repeated application of the same state does not introduce
 *     inconsistencies.
 */
export async function test_api_comment_state_update_idempotency_for_community_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin signs up and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Platform admin creates a basic text post type
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Basic Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);
  TestValidator.equals(
    "created post type code should match request",
    postType.code,
    postTypeCode,
  );

  // 4. Member user registers and authenticates
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 5. Member user creates a community using the created visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Idempotency Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community visibility level code should match created visibility",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. Member user creates a text post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Idempotency Test Post",
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post should be created in the expected community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post should use the expected post type",
    post.postType.id,
    postType.id,
  );

  // 7. Member user creates a top-level comment under that post
  const commentCreateBody = {
    body: "This is a comment to test moderator state idempotency.",
    renderingMode: "markdown",
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
  TestValidator.equals(
    "comment should belong to the expected post",
    comment.post.id,
    post.id,
  );

  // 8. Community moderator registers and authenticates
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 9. Using moderator context, perform the first comment state update
  const stateUpdateBody = {
    visibility_state: "visible",
    lock_state: "unlocked",
    collapse_state: "expanded",
    moderation_state: "none",
    moderation_reason: null,
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const state1: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: stateUpdateBody,
      },
    );
  typia.assert(state1);
  TestValidator.equals(
    "first state update should target the expected comment",
    state1.comment_id,
    comment.id,
  );

  // 10. Call the same endpoint again with an identical request body
  const state2: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: stateUpdateBody,
      },
    );
  typia.assert(state2);

  // 11. Idempotency assertions: domain fields must remain identical
  TestValidator.equals(
    "comment_id must remain the same across repeated updates",
    state2.comment_id,
    state1.comment_id,
  );
  TestValidator.equals(
    "visibility_state must be identical across repeated updates",
    state2.visibility_state,
    state1.visibility_state,
  );
  TestValidator.equals(
    "lock_state must be identical across repeated updates",
    state2.lock_state,
    state1.lock_state,
  );
  TestValidator.equals(
    "collapse_state must be identical across repeated updates",
    state2.collapse_state,
    state1.collapse_state,
  );
  TestValidator.equals(
    "moderation_state must be identical across repeated updates",
    state2.moderation_state,
    state1.moderation_state,
  );
  TestValidator.equals(
    "moderation_reason must remain consistent across repeated updates",
    state2.moderation_reason,
    state1.moderation_reason,
  );

  // 12. Optional check: updated_at should not regress
  TestValidator.predicate(
    "updated_at of second state should be the same or later than first",
    new Date(state2.updated_at).getTime() >=
      new Date(state1.updated_at).getTime(),
  );
}
