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

export async function test_api_comment_state_update_rejects_unauthorized_actor(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in to be able to create configuration master data.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass!123",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level that member user will use.
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Visibility",
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

  // 3. Platform admin creates a post type that will be used when the member user creates a post.
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphaNumeric(6)}`,
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

  // 4. Member user joins and is automatically authenticated by the join endpoint.
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "MemberPass!123",
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As the member user (current connection token is member), create a community using the created visibility level code.
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. Member user creates a post in that community using the created post type.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member user creates a comment under that post.
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "plainText" as const,
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

  // At this point, we have a legitimate comment created by a member user.
  // 8. Still authenticated as the member user, attempt to call the moderator-only update endpoint.
  const commentStateUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason:
      "Test unauthorized moderation attempt should not succeed.",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  await TestValidator.error(
    "member user cannot update comment state via moderator endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.comments.state.update(
        connection,
        {
          commentId: comment.id,
          body: commentStateUpdateBody,
        },
      );
    },
  );
}
