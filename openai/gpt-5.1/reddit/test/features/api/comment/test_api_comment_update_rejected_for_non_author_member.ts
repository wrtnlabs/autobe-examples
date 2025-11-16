import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Ensure a non-author member user cannot update another user's comment.
 *
 * Business flow:
 *
 * 1. Platform admin joins and configures a visibility level and a post type.
 * 2. User A joins as a member user.
 * 3. User B joins as another member user.
 * 4. User A logs in, creates a community using the configured visibility level.
 * 5. User A creates a post in that community using the configured post type.
 * 6. User A creates a comment on the post.
 * 7. User B logs in and attempts to update User A's comment via the memberUser
 *    comment update endpoint.
 *
 * Expected results:
 *
 * - The unauthorized update by User B throws an error (authorization or ownership
 *   violation) when calling the update endpoint.
 * - We do not assert on HTTP status codes or error shapes, only that an error
 *   occurs.
 */
export async function test_api_comment_update_rejected_for_non_author_member(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap: join and configure visibility level & post type
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // Create a post type
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: `Text ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 2. User A joins as member user
  const userAPassword = RandomGenerator.alphaNumeric(12);
  const userAEmail =
    `userA_${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const userAJoinBody = {
    username: `userA_${RandomGenerator.alphabets(6)}`,
    email: userAEmail,
    password: userAPassword,
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const userAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAAuthorized);

  // 3. User B joins as member user
  const userBPassword = RandomGenerator.alphaNumeric(12);
  const userBEmail =
    `userB_${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const userBJoinBody = {
    username: `userB_${RandomGenerator.alphabets(6)}`,
    email: userBEmail,
    password: userBPassword,
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const userBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBAuthorized);

  // 4. Switch auth to User A via login
  const userALoginBody = {
    identifier: userAEmail,
    password: userAPassword,
    ip: undefined,
    href: undefined,
    referrer: undefined,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const userALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert(userALogin);

  // 4-1. User A creates a community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. User A creates a post in the community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. User A creates a comment on the post
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const commentCreateBody = {
    body: originalCommentBody,
    parentCommentId: undefined,
    renderingMode: "markdown" as "markdown" | "plainText" | undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  TestValidator.equals(
    "newly created comment should not be marked as edited",
    createdComment.is_edited,
    false,
  );

  // 7. Switch auth context to User B via login
  const userBLoginBody = {
    identifier: userBEmail,
    password: userBPassword,
    ip: undefined,
    href: undefined,
    referrer: undefined,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const userBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: userBLoginBody,
    });
  typia.assert(userBLogin);

  // 7-1. Prepare an update payload for the comment
  const unauthorizedUpdateBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformComment.IUpdate;

  // 7-2. Attempt to update the comment as non-author (User B) and expect error
  await TestValidator.error(
    "non-author member user cannot update another user's comment",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.update(
        connection,
        {
          postId: post.id,
          commentId: createdComment.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
