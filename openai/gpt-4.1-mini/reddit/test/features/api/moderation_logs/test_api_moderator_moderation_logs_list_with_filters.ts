import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
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
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_moderation_logs_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of moderation logs with pagination and filters.
  // - Setup users and moderator
  // - Create a community
  // - Assign moderator
  // - Create a post
  // - Create a comment
  // - Fetch moderation logs with filters
  // - Validate response
  // Scenario 2: Authorization failure test for unauthenticated access
  // Step 1: Moderator join and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = "defaultpassword123";
  const moderatorJoinedRaw = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarUrl: typia.random<string & tags.Format<"uri">>(),
        password: moderatorPassword,
      } as any, // force password field for join
    },
  );
  typia.assert(moderatorJoinedRaw);
  const moderatorJoined = moderatorJoinedRaw as { email: string } & typeof moderatorJoinedRaw;
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLoggedIn = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorJoined.email,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorLoggedIn);
  // Step 2: User join and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userPassword = "defaultpassword123";
  const userJoined = await authorize_user_join(userJoinConnection, {
    body: { password: userPassword } as any,
  });
  typia.assert(userJoined);
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoggedIn = await authorize_user_login(userLoginConnection, {
    body: {
      email: userJoined.email,
      password: userPassword,
    },
  });
  typia.assert(userLoggedIn);
  // Step 3: Create community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userLoginConnection,
      {
        body: {
          name: `testcommunity_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // Step 4: Assign moderator to community
  const communityModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorLoginConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorLoggedIn.id,
          role: "moderator",
        },
      },
    );
  typia.assert(communityModerator);
  // Step 5: Create a post in the community as user
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userLoginConnection,
      {
        communityId: community.id,
        body: {
          postType: "text",
          title: RandomGenerator.name(3),
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 6: Create a comment on the post as user
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userLoginConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Step 7: Fetch moderation logs with filters as moderator
  const nowISO = new Date().toISOString();
  const oneDayAgoISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const moderationLogsResponse =
    await api.functional.communityPlatform.moderator.moderationLogs.index(
      moderatorLoginConnection,
      {
        body: {
          moderatorId: moderatorLoggedIn.id,
          actionType: "delete_post",
          postId: post.id,
          createdAtFrom: oneDayAgoISO,
          createdAtTo: nowISO,
          page: 1,
          limit: 10,
          sortBy: "created_at",
        } satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(moderationLogsResponse);
  // Validate properties of each moderation log
  for (const log of moderationLogsResponse.data) {
    typia.assert(log);
    TestValidator.predicate("log has moderator", log.moderator !== null);
    TestValidator.equals(
      "action type is delete_post",
      log.actionType,
      "delete_post",
    );
    if (log.post !== null && log.post !== undefined) {
      TestValidator.equals("post id filter", log.post.id, post.id);
    }
    if (log.createdAt) {
      TestValidator.predicate(
        "createdAt is within range",
        log.createdAt >= oneDayAgoISO && log.createdAt <= nowISO,
      );
    }
  }
  // Scenario 2: Authorization failure when attempting without login
  // Use base connection without authorization
  await TestValidator.httpError(
    "authorization failure without login",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.moderationLogs.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
}
