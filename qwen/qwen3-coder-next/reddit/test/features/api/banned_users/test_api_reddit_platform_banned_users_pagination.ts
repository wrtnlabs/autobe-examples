import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_admin_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_reddit_platform_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create member account for ban testing
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Ban at least 15 users with staggered expiration times
  const bannedUsers: IRedditPlatformBan[] = [];
  for (let i = 0; i < 15; i++) {
    const banUser =
      await generate_random_reddit_platform_admin_communities_bans_ban(
        adminConnection,
        {
          body: {
            community_id: community.id,
            user_id: memberConnection.headers?.Authorization
              ? (memberConnection.headers["Authorization"] as string)
              : "",
            reason: `Ban reason ${i + 1}`,
            expired_at: i < 5 ? new Date().toISOString() : null, // 5 temporary bans
          } satisfies IRedditPlatformBan.ICreate,
          params: {
            communityId: community.id,
          },
        },
      );
    bannedUsers.push(banUser);
  }
  typia.assert(bannedUsers);
  // 5. Call banned users endpoint with limit=5 for pagination
  const result =
    await api.functional.redditPlatform.admin.communities.banned_users.index(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 5", result.pagination.limit, 5);
  TestValidator.predicate("records >= 15", result.pagination.records >= 15);
  TestValidator.predicate("pages >= 3", result.pagination.pages >= 3);
  // 7. Validate data array contains exactly 5 ban records
  TestValidator.equals("data array has 5 records", result.data.length, 5);
  // 8. Validate ban record structure
  result.data.forEach((ban) => {
    typia.assert<IRedditPlatformBan.ISummary>(ban);
    TestValidator.predicate("has valid user summary", ban.user !== null);
    TestValidator.predicate("has valid admin summary", ban.bannedBy !== null);
    TestValidator.equals("has non-empty reason", ban.reason.length > 0, true);
    TestValidator.predicate(
      "has valid created_at timestamp",
      new Date(ban.created_at) instanceof Date,
    );
    TestValidator.predicate(
      "has valid expired_at (null or valid date)",
      ban.expired_at === null || new Date(ban.expired_at) instanceof Date,
    );
  });
}