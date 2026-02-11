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

export async function test_api_reddit_platform_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(1),
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create community for testing ban functionality
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create member users to ban
  const memberConnection1: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const memberConnection2: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 4. Ban multiple users with different expiration states
  const ban1 = await api.functional.redditPlatform.admin.communities.bans.ban(
    adminConnection,
    {
      communityId: community.id,
      body: {
        user_id: member1.id,
        reason: "Spamming community guidelines",
        expired_at: null, // Permanent ban
        community_id: community.id,
      } satisfies IRedditPlatformBan.ICreate,
    },
  );
  typia.assert(ban1);
  const ban2 = await api.functional.redditPlatform.admin.communities.bans.ban(
    adminConnection,
    {
      communityId: community.id,
      body: {
        user_id: member2.id,
        reason: "Inappropriate content",
        expired_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Temporary ban (7 days)
        community_id: community.id,
      } satisfies IRedditPlatformBan.ICreate,
    },
  );
  typia.assert(ban2);
  // 5. Call banned users list endpoint
  const bannedUsersList =
    await api.functional.redditPlatform.admin.communities.banned_users.index(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(bannedUsersList);
  // 6. Validate response structure
  TestValidator.predicate(
    "has pagination info",
    bannedUsersList.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(bannedUsersList.data),
  );
  // 7. Validate pagination structure
  const pagination = bannedUsersList.pagination;
  TestValidator.predicate(
    "pagination has current",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // 8. Validate banned users data
  TestValidator.equals(
    "ban count matches records",
    bannedUsersList.data.length,
    pagination.records,
  );
  TestValidator.predicate(
    "has at least 2 banned users",
    bannedUsersList.data.length >= 2,
  );
  // 9. Validate individual ban records
  const banRecord1 = bannedUsersList.data.find((b) => b.user.id === member1.id);
  const banRecord2 = bannedUsersList.data.find((b) => b.user.id === member2.id);
  TestValidator.notEquals("first user ban exists", banRecord1, undefined);
  TestValidator.notEquals("second user ban exists", banRecord2, undefined);
  // 10. Validate ban record structure
  if (banRecord1 && banRecord2) {
    // Validate user details
    TestValidator.equals(
      "user username matches",
      banRecord1.user.username,
      member1.username,
    );
    TestValidator.equals(
      "user2 username matches",
      banRecord2.user.username,
      member2.username,
    );
    // Validate ban metadata
    TestValidator.equals(
      "ban reason matches",
      banRecord1.reason,
      "Spamming community guidelines",
    );
    TestValidator.equals(
      "ban2 reason matches",
      banRecord2.reason,
      "Inappropriate content",
    );
    // Validate expiration dates
    TestValidator.equals(
      "permanent ban has null expiry",
      banRecord1.expired_at,
      null,
    );
    TestValidator.predicate(
      "temporary ban has expiry",
      banRecord2.expired_at !== null,
    );
    // Validate moderator information
    TestValidator.equals(
      "bannedBy username matches admin username",
      banRecord1.bannedBy.username,
      adminMember.username,
    );
    TestValidator.equals(
      "bannedBy2 username matches admin username",
      banRecord2.bannedBy.username,
      adminMember.username,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "created_at exists",
      banRecord1.created_at !== undefined,
    );
    TestValidator.predicate(
      "created_at2 exists",
      banRecord2.created_at !== undefined,
    );
  }
}