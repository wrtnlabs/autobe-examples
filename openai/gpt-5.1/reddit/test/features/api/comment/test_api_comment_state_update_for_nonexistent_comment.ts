import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
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
 * Verify that comment state update fails for a non-existent comment.
 *
 * Business goal:
 *
 * - Ensure that the moderation state for comments cannot be created/updated when
 *   the target comment does not exist.
 * - Ensure that only an authenticated community moderator can reach this
 *   validation and that the system produces a failure when a fake UUID is used
 *   as the commentId path parameter.
 *
 * High level flow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a community visibility level.
 * 3. Platform admin creates a post type.
 * 4. Member user joins and logs in.
 * 5. Member user creates a community using the created visibility level code.
 * 6. Member user creates a post in that community using the created post type. (No
 *    comments are created at all.)
 * 7. Community moderator joins and logs in.
 * 8. Community moderator attempts to update comment state using a syntactically
 *    valid but non-existent commentId (fresh UUID) and a valid
 *    ICommunityPlatformCommentState.IUpdate body.
 * 9. Assert that the update call throws an error using TestValidator.error,
 *    without asserting specific HTTP status codes.
 */
export async function test_api_comment_state_update_for_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-auth via SDK) to obtain an admin account.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a post type.
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text",
    description: "Simple text post",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 5. Member user logs in explicitly to ensure user context is active.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Member user creates a community using the visibility level code.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Nonexistent Comment Test Community",
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

  // 7. Member user creates a text post in that community using created post type.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Test post for nonexistent comment state update",
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // NOTE: No comments are created for this post. We will use a fake commentId.

  // 8. Community moderator joins.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: undefined,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 9. Community moderator logs in explicitly to ensure moderator context.
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: undefined,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 10. Prepare a syntactically valid but non-existent commentId.
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 11. Prepare a valid update payload for comment state.
  const updateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: "Testing update on nonexistent comment",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  // 12. Attempt to update state for the non-existent comment and expect an error.
  await TestValidator.error(
    "updating comment state for non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.comments.state.update(
        connection,
        {
          commentId: fakeCommentId,
          body: updateBody,
        },
      );
    },
  );
}
