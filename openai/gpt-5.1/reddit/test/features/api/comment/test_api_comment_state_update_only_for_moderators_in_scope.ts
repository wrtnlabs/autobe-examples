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
 * Verify that a community moderator can only update comment state for comments
 * in communities they moderate.
 *
 * Business scenario:
 *
 * - Platform admin configures a visibility level and a post type.
 * - Member user A creates Community A, a post, and a comment.
 * - Member user B creates Community B, a post, and a comment.
 * - A community moderator performs a state update on the comment in Community A
 *   (expected success).
 * - The same moderator attempts to update the state of the comment in Community B
 *   (expected error due to scoping).
 *
 * The test uses only the provided APIs and DTOs, validates shapes with
 * typia.assert, and uses TestValidator for business assertions and error
 * expectations without checking specific HTTP status codes.
 */
export async function test_api_comment_state_update_only_for_moderators_in_scope(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in (token on connection is set automatically)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
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
    name: "Public visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type
  const postTypeCode = `post_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 4. Member user A joins and logs in
  const memberAJoinBody = {
    username: `memberA_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuth);

  // 5. Member user A creates Community A
  const communityACreateBody = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityACreateBody },
    );
  typia.assert(communityA);

  // 6. Member user A creates a post in Community A
  const postACreateBody = {
    community_id: communityA.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postACreateBody,
    });
  typia.assert(postA);

  // 7. Member user A creates a comment in post A
  const commentACreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentACreateBody,
      },
    );
  typia.assert(commentA);

  // 8. Member user B joins and logs in
  const memberBJoinBody = {
    username: `memberB_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuth);

  // 9. Member user B creates Community B
  const communityBCreateBody = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBCreateBody },
    );
  typia.assert(communityB);

  // 10. Member user B creates a post in Community B
  const postBCreateBody = {
    community_id: communityB.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBCreateBody,
    });
  typia.assert(postB);

  // 11. Member user B creates a comment in post B
  const commentBCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: commentBCreateBody,
      },
    );
  typia.assert(commentB);

  // 12. Community moderator joins (new actor) and gets authorized
  const moderatorJoinBody = {
    username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  // 13. As communityModerator, perform in-scope state update for comment A
  const inScopeUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: "Violation of community guidelines in Community A",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const inScopeState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: commentA.id,
        body: inScopeUpdateBody,
      },
    );
  typia.assert(inScopeState);

  // Assert that the state belongs to the correct comment and reflects our updates
  TestValidator.equals(
    "in-scope update should target comment A",
    inScopeState.comment_id,
    commentA.id,
  );
  TestValidator.equals(
    "visibility_state should be updated for in-scope comment",
    inScopeState.visibility_state,
    inScopeUpdateBody.visibility_state,
  );
  TestValidator.equals(
    "moderation_state should be updated for in-scope comment",
    inScopeState.moderation_state,
    inScopeUpdateBody.moderation_state,
  );

  // 14. Attempt out-of-scope update on comment B; expect an error of some kind
  const outOfScopeUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason:
      "Attempted moderation in Community B by out-of-scope moderator",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  await TestValidator.error(
    "out-of-scope comment moderation must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.comments.state.update(
        connection,
        {
          commentId: commentB.id,
          body: outOfScopeUpdateBody,
        },
      );
    },
  );
}
