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

export async function test_api_comment_state_update_moderation_reason_clearing(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
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
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user login (to ensure correct session context; though join already set token)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Member user creates a community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 7. Member user creates a post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 8. Member user creates a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
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

  // 9. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://moderator.example.com/register",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 10. Community moderator login
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: moderatorJoinBody.ip ?? null,
    href: moderatorJoinBody.href,
    referrer: moderatorJoinBody.referrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 11. Moderator applies restrictive state with non-empty moderation_reason
  const restrictiveUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: "Contains policy-violating content pending review.",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const restrictiveState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: restrictiveUpdateBody,
      },
    );
  typia.assert(restrictiveState);

  TestValidator.equals(
    "restrictive state visibility_state should match request",
    restrictiveState.visibility_state,
    restrictiveUpdateBody.visibility_state,
  );
  TestValidator.equals(
    "restrictive state lock_state should match request",
    restrictiveState.lock_state,
    restrictiveUpdateBody.lock_state,
  );
  TestValidator.equals(
    "restrictive state collapse_state should match request",
    restrictiveState.collapse_state,
    restrictiveUpdateBody.collapse_state,
  );
  TestValidator.equals(
    "restrictive state moderation_state should match request",
    restrictiveState.moderation_state,
    restrictiveUpdateBody.moderation_state,
  );
  TestValidator.equals(
    "restrictive state moderation_reason should match non-empty reason",
    restrictiveState.moderation_reason,
    restrictiveUpdateBody.moderation_reason,
  );

  // 12. Moderator clears moderation_reason while restoring to a normal state
  const clearingUpdateBody = {
    visibility_state: "visible",
    lock_state: "unlocked",
    collapse_state: "expanded",
    moderation_state: "none",
    moderation_reason: null,
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const clearedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: clearingUpdateBody,
      },
    );
  typia.assert(clearedState);

  // Validate state fields reflect the less restrictive state
  TestValidator.equals(
    "cleared state visibility_state should be visible",
    clearedState.visibility_state,
    clearingUpdateBody.visibility_state,
  );
  TestValidator.equals(
    "cleared state lock_state should be unlocked",
    clearedState.lock_state,
    clearingUpdateBody.lock_state,
  );
  TestValidator.equals(
    "cleared state collapse_state should be expanded",
    clearedState.collapse_state,
    clearingUpdateBody.collapse_state,
  );
  TestValidator.equals(
    "cleared state moderation_state should be none",
    clearedState.moderation_state,
    clearingUpdateBody.moderation_state,
  );

  // Verify moderation_reason has been cleared to null
  TestValidator.equals(
    "moderation_reason should be cleared (null) after update",
    clearedState.moderation_reason,
    clearingUpdateBody.moderation_reason,
  );
}
