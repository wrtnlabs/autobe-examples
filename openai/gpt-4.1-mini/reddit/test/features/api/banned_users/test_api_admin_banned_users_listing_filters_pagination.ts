import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_admin_banned_users_create_banned_user";
import { generate_random_community_platform_moderator_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_banned_users_create_banned_user";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_admin_banned_users_listing_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of paginated banned users list by an admin with filters and pagination
  // 1. Prepare actor connections
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Admin join
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuth);
  // 3. Admin login (simulate login again for demonstration, ensuring token renewed)
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: "AdminPass123!",
    },
  });
  typia.assert(adminLogin);
  // 4. Create a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userAuth);
  // 5. Create a community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 6. Subscribe user to community
  await generate_random_community_platform_user_subscriptions_create(
    userConnection,
    {
      body: {
        communityCode: community.name,
      },
    },
  );
  // 7. Add banned user record as admin (ban active)
  const banReason1 = "Violation of community rules";
  const bannedUser1 =
    await generate_random_community_platform_admin_banned_users_create_banned_user(
      adminConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_id: community.id,
          banned_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          reason: banReason1,
          unbanned_at: null,
        },
      },
    );
  typia.assert(bannedUser1);
  // 8. Add banned user record as admin (ban lifted)
  const banReason2 = "Spam posting";
  const bannedUser2 =
    await generate_random_community_platform_admin_banned_users_create_banned_user(
      adminConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_id: community.id,
          banned_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          reason: banReason2,
          unbanned_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
      },
    );
  typia.assert(bannedUser2);
  // 9. Prepare filter tests for listing
  // No filters (get all)
  const allBannedUsers =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(allBannedUsers);
  // Validate pagination
  TestValidator.predicate(
    "pagination current page >= 1",
    allBannedUsers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit <= 20",
    allBannedUsers.pagination.limit <= 20,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    allBannedUsers.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    allBannedUsers.pagination.records >= allBannedUsers.data.length,
  );
  // Specific filter: communityPlatformCommunityId
  const filteredByCommunity =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          communityPlatformCommunityId: community.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredByCommunity);
  for (const item of filteredByCommunity.data) {
    TestValidator.equals(
      "filtered community id",
      item.community.id,
      community.id,
    );
  }
  // Specific filter: communityPlatformUserId
  const filteredByUser =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          communityPlatformUserId: userAuth.id,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredByUser);
  for (const item of filteredByUser.data) {
    TestValidator.equals("filtered user id", item.user.id, userAuth.id);
  }
  // Filter by ban status isBanned true (active bans)
  const filteredIsBannedTrue =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          isBanned: true,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredIsBannedTrue);
  for (const item of filteredIsBannedTrue.data) {
    TestValidator.predicate(
      "isBanned true means unbannedAt null",
      item.unbannedAt === null || item.unbannedAt === undefined,
    );
  }
  // Filter by ban status isBanned false (unbanned)
  const filteredIsBannedFalse =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          isBanned: false,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredIsBannedFalse);
  for (const item of filteredIsBannedFalse.data) {
    TestValidator.predicate(
      "isBanned false means unbannedAt NOT null",
      item.unbannedAt !== null && item.unbannedAt !== undefined,
    );
  }
  // Filter by bannedAtFrom (>=)
  const fromDate = new Date(Date.now() - 3 * 86400000).toISOString(); // 3 days ago
  const filteredBannedAtFrom =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          bannedAtFrom: fromDate,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredBannedAtFrom);
  for (const item of filteredBannedAtFrom.data) {
    TestValidator.predicate(
      "bannedAt >= bannedAtFrom",
      item.bannedAt >= fromDate,
    );
  }
  // Filter by bannedAtTo (<=)
  const toDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const filteredBannedAtTo =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          bannedAtTo: toDate,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredBannedAtTo);
  for (const item of filteredBannedAtTo.data) {
    TestValidator.predicate("bannedAt <= bannedAtTo", item.bannedAt <= toDate);
  }
  // Pagination test: page 1, limit 1
  const paginationTest =
    await api.functional.communityPlatform.admin.banned_users.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit equals 1",
    paginationTest.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination data length less or equals 1",
    paginationTest.data.length <= 1,
  );
  // Pagination test: page 2 with limit 1
  if (paginationTest.pagination.pages >= 2) {
    const page2 =
      await api.functional.communityPlatform.admin.banned_users.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 1,
          },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page equals 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "pagination data length less or equals 1",
      page2.data.length <= 1,
    );
  }
}
