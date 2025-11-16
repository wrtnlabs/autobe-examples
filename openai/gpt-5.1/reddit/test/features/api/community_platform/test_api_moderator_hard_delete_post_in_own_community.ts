import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_moderator_hard_delete_post_in_own_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and configures visibility level and post type
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;

  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: "Public communities visible to all users",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;

  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text post",
    description: "Simple text-based post type used for moderator delete tests",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 2. Member user joins and creates community and post
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: RandomGenerator.alphabets(16),
    ip: "127.0.0.1",
    href: "https://app.local/signup",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUser);

  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Post ${RandomGenerator.name(3)}`,
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 3. Community moderator joins and deletes the post
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.test`,
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.console.local/join",
    referrer: "https://mod.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // First delete attempt should succeed without throwing
  await api.functional.communityPlatform.communityModerator.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );

  // 4. Second delete attempt should fail, indicating the post is gone
  await TestValidator.error(
    "second delete on already deleted post should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.posts.erase(
        connection,
        {
          postId: post.id,
        },
      );
    },
  );
}
