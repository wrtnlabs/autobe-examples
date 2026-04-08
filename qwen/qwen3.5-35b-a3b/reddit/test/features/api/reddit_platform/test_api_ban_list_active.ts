import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_ban_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner1234",
      username: RandomGenerator.alphaNumeric(8) + "_owner",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const communityName = RandomGenerator.alphaNumeric(8) + "_community";
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Test user joins (will be banned)
  const testUserConnection: api.IConnection = { host: connection.host };
  const testUserAuth = await authorize_member_join(testUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testuser1234",
      username: RandomGenerator.alphaNumeric(8) + "_testuser",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(testUserAuth);
  // 3. Owner bans test user
  const banReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          user_id: testUserAuth.id,
          reason: banReason,
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: { communityName },
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban is active (unbanned_at is null)
  TestValidator.equals(
    "ban is active (unbanned_at is null)",
    banRecord.unbanned_at,
    null,
  );
  TestValidator.equals("ban reason matches", banRecord.reason, banReason);
  // 5. Outsider joins but cannot access ban list
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsiderAuth = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "outsider1234",
      username: RandomGenerator.alphaNumeric(8) + "_outsider",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(outsiderAuth);
  // 6. Outsider attempts to list bans - should get 403 Forbidden
  await TestValidator.httpError(
    "outsider cannot access ban list",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.bans.index(
        outsiderConnection,
        {
          communityName,
          body: {
            status: "active",
            page: 1,
            limit: 20,
          } satisfies IRedditPlatformCommunityBan.IRequest,
        },
      );
    },
  );
  // 7. Owner retrieves ban list with active filter
  const banList =
    await api.functional.redditPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName,
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // 8. Validate ban list structure and data
  TestValidator.equals(
    "pagination current page",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", banList.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    banList.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages count", banList.pagination.pages, 1);
  TestValidator.equals("ban list has 1 data record", banList.data.length, 1);
  const returnedBan = banList.data[0];
  typia.assert(returnedBan);
  TestValidator.equals("ban record id matches", returnedBan.id, banRecord.id);
  TestValidator.equals(
    "ban user id matches",
    returnedBan.user.id,
    testUserAuth.id,
  );
  TestValidator.equals(
    "ban user username matches",
    returnedBan.user.username,
    testUserAuth.username,
  );
  TestValidator.equals("ban reason matches", returnedBan.reason, banReason);
  TestValidator.equals(
    "ban is active (unbanned_at null)",
    returnedBan.unbanned_at,
    null,
  );
  TestValidator.predicate(
    "ban has valid banned_at timestamp",
    returnedBan.banned_at !== undefined,
  );
  // 9. Verify pagination metadata reflects 1 active ban
  TestValidator.predicate(
    "pagination reflects 1 active ban",
    banList.pagination.records === 1 && banList.pagination.pages === 1,
  );
}
