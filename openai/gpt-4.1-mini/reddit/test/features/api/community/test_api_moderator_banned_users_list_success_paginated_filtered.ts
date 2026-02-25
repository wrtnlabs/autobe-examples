import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_banned_users_list_success_paginated_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare user actor (normal user who creates community)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  // 3. Prepare multiple users who will be banned
  const userBanList: {
    auth: ICommunityPlatformUser.IAuthorized;
    connection: api.IConnection;
    banReason: string;
    bannedAt: string;
    unbannedAt: string | null;
  }[] = [];
  // Create 5 users, ban some and unban one
  for (let i = 0; i < 5; ++i) {
    const actorConnection: api.IConnection = { host: connection.host };
    const userAuthJoin = await authorize_user_join(actorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    });
    actorConnection.headers = { Authorization: userAuthJoin.token.access };
    // Ban timestamps
    const bannedAt = new Date(
      Date.now() - (i + 1) * 24 * 60 * 60 * 1000,
    ).toISOString();
    // Unban one user for testing unbanned filter
    const unbannedAt =
      i === 4 ? new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() : null;
    userBanList.push({
      auth: userAuthJoin,
      connection: actorConnection,
      banReason: `Test ban reason #${i + 1}`,
      bannedAt,
      unbannedAt,
    });
  }
  // 4. Prepare moderator actor, join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthJoin = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  moderatorConnection.headers = {
    Authorization: moderatorAuthJoin.token.access,
  };
  // 5. Invoke patch banned-users/list to retrieve first page of banned users, filter by banStatus 'banned'
  {
    const page = 1;
    const limit = 3;
    const filterBanStatus = "banned" as const;
    const listResponse =
      await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
        moderatorConnection,
        {
          communityId: community.id,
          body: {
            banStatus: filterBanStatus,
            page,
            limit,
          },
        },
      );
    typia.assert(listResponse);
    // Validate pagination data correctness
    TestValidator.equals(
      "pagination current page",
      listResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit",
      listResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records positive",
      listResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages positive",
      listResponse.pagination.pages >= 0,
    );
    // All returned banned users must have unbannedAt null (banStatus banned)
    for (const banned of listResponse.data) {
      TestValidator.predicate(
        "banned user unbannedAt is null",
        banned.unbannedAt === null,
      );
      TestValidator.predicate(
        "banned user bannedAt is ISO date",
        !Number.isNaN(Date.parse(banned.bannedAt)),
      );
      TestValidator.predicate(
        "banned user banReason non-empty",
        banned.banReason.length > 0,
      );
      // Validate user summary
      const user = banned.user;
      TestValidator.predicate(
        "user id is UUID",
        /^[0-9a-f-]{36}$/i.test(user.id),
      );
      TestValidator.predicate(
        "user username non-empty",
        user.username.length > 0,
      );
      TestValidator.predicate(
        "user displayName non-empty",
        user.displayName.length > 0,
      );
    }
  }
  // 6. Test filtering by search term that should match some user's username
  {
    // Pick username substring from one banned user for search
    const searchTerm = userBanList[1].auth.username.substring(
      0,
      Math.min(3, userBanList[1].auth.username.length),
    );
    const listSearched =
      await api.functional.communityPlatform.moderator.communities.banned_users.list.index(
        moderatorConnection,
        {
          communityId: community.id,
          body: {
            banStatus: "banned",
            search: searchTerm,
            page: 1,
            limit: 10,
          },
        },
      );
    typia.assert(listSearched);
    for (const banned of listSearched.data) {
      const user = banned.user;
      // username or displayName or banReason must include search term
      const match =
        user.username.includes(searchTerm) ||
        user.displayName.includes(searchTerm) ||
        banned.banReason.includes(searchTerm);
      TestValidator.predicate("search filter match", match);
    }
  }
}
