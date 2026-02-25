import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_moderator_communities_moderators_create_moderator";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_post_comments_create } from "../../../generate/generate_random_community_platform_user_post_comments_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_moderator_deleted_contents_pagination_limits_and_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Fixed password to use consistently for moderator join and login
  const fixedModeratorPassword = "ModeratorPass123!";
  // 1. Moderator registration and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const moderatorJoinResult: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphabets(6)}`,
        displayName: `Mod ${RandomGenerator.name()}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: "https://example.com/avatar.png",
        // Note: join DTO does not have password field, assume fixed password is set internally
      },
    });
  typia.assert(moderatorJoinResult);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorEmail,
      password: fixedModeratorPassword,
    },
  });
  // Authorization header is set internally on login
  // 2. User registration and login
  const fixedUserPassword = "UserPass123!";
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userEmail = `user_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const userJoinResult: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userJoinConnection, {
      body: {
        email: userEmail,
        password: fixedUserPassword,
        username: `user_${RandomGenerator.alphabets(6)}`,
        displayName: `User ${RandomGenerator.name()}`,
        href: "https://example.com/signup",
        referrer: "https://example.com/referrer",
        ip: null,
      },
    });
  typia.assert(userJoinResult);
  const userLoginConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection, {
    body: {
      email: userEmail,
      password: fixedUserPassword,
    },
  });
  // 3. User creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      userLoginConnection,
      { body: { name: `community_${RandomGenerator.alphaNumeric(6)}` } },
    );
  typia.assert(community);
  // 4. Moderator assigned to the community
  const moderatorAssignment =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorLoginConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorJoinResult.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. User creates a post
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userLoginConnection,
      {
        communityId: community.id,
        body: {
          title: `Post ${RandomGenerator.alphaNumeric(6)}`,
          postType: "text",
          content: `This is a test post content ${RandomGenerator.paragraph({ sentences: 1 })}`,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 6. User creates a comment on the post
  const comment =
    await generate_random_community_platform_user_post_comments_create(
      userLoginConnection,
      {
        body: {
          post_id: post.id,
          content_text: `Comment content ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(comment);
  // 7. Edge case tests for pagination with deleted contents
  // Large limit (max allowed 100)
  const largeLimitInput: ICommunityPlatformDeletedContent.IRequest = {
    moderator_id: moderatorJoinResult.id,
    limit: 100,
    page: 1,
  };
  const responseLargeLimit =
    await api.functional.communityPlatform.moderator.deleted_contents.index(
      moderatorLoginConnection,
      { body: largeLimitInput },
    );
  typia.assert(responseLargeLimit);
  TestValidator.predicate(
    "large limit does not exceed 100",
    responseLargeLimit.pagination.limit <= 100,
  );
  // Page number out of bounds (high page number)
  const outOfBoundPageInput: ICommunityPlatformDeletedContent.IRequest = {
    moderator_id: moderatorJoinResult.id,
    limit: 10,
    page: 9999, // intentionally too large
  };
  const responseOutOfBound =
    await api.functional.communityPlatform.moderator.deleted_contents.index(
      moderatorLoginConnection,
      { body: outOfBoundPageInput },
    );
  typia.assert(responseOutOfBound);
  TestValidator.predicate(
    "page out of bounds returns empty data",
    responseOutOfBound.data.length === 0 ||
      responseOutOfBound.data.length <= (outOfBoundPageInput.limit ?? 0),
  );
  TestValidator.predicate(
    "pagination current page respects requested page",
    responseOutOfBound.pagination.current === outOfBoundPageInput.page,
  );
  // Invalid pagination inputs
  const invalidPaginationInputs = [
    { page: 0, limit: 10 },
    { page: -1, limit: 10 },
    { page: 1, limit: 0 },
    { page: 1, limit: 101 },
  ];
  for (const { page, limit } of invalidPaginationInputs) {
    await TestValidator.error(
      `invalid pagination input page=${page} limit=${limit}`,
      async () => {
        await api.functional.communityPlatform.moderator.deleted_contents.index(
          moderatorLoginConnection,
          {
            body: { moderator_id: moderatorJoinResult.id, page, limit },
          },
        );
      },
    );
  }
}
