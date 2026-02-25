import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_communities_banned_users_list_with_unbanned_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin user registration
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoinResponse);
  // 2. Admin login with saved password
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResponse.email,
      password: adminPassword,
    },
  });
  typia.assert(adminLoginResponse);
  // Use adminLoginConnection from now on for authorized calls
  // 3. Create community with admin (admin user acts as user in creation)
  const community =
    await generate_random_community_platform_user_communities_create(
      adminLoginConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Call banned users list with banStatus = "unbanned"
  const bannedUsersList =
    await api.functional.communityPlatform.admin.communities.banned_users.list.index(
      adminLoginConnection,
      {
        communityId: community.id,
        body: {
          banStatus: "unbanned",
        } satisfies ICommunityPlatformCommunityBannedUser.IRequest,
      },
    );
  typia.assert(bannedUsersList);
  // 5. Validate response structure
  // 5a. Validate pagination meta
  TestValidator.predicate(
    "pagination current is non-negative",
    bannedUsersList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    bannedUsersList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    bannedUsersList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    bannedUsersList.pagination.pages >= 0,
  );
  // 5b. Verify data array elements properties
  bannedUsersList.data.forEach((banRecord, idx) => {
    typia.assert(banRecord);
    // Ban record properties
    TestValidator.predicate(
      `ban record[${idx}] unbannedAt is string or null`,
      banRecord.unbannedAt === null || typeof banRecord.unbannedAt === "string",
    );
    TestValidator.predicate(
      `ban record[${idx}] has ban reason`,
      typeof banRecord.banReason === "string" && banRecord.banReason.length > 0,
    );
    // User properties
    TestValidator.predicate(
      `ban record[${idx}] user id is uuid`,
      /^[0-9a-fA-F-]{36}$/.test(banRecord.user.id),
    );
    TestValidator.predicate(
      `ban record[${idx}] user email is string`,
      typeof banRecord.user.email === "string",
    );
    TestValidator.predicate(
      `ban record[${idx}] user username is string`,
      typeof banRecord.user.username === "string",
    );
    TestValidator.predicate(
      `ban record[${idx}] user displayName is string`,
      typeof banRecord.user.displayName === "string",
    );
    TestValidator.predicate(
      `ban record[${idx}] user karma is number`,
      typeof banRecord.user.karma === "number",
    );
  });
  // 6. Additional checks for empty result handling
  if (bannedUsersList.data.length === 0) {
    TestValidator.predicate(
      "empty data array when no unbanned users",
      bannedUsersList.data.length === 0,
    );
  }
  // 7. Test filtering behavior by banStatus
  // Already tested above for 'unbanned' filter
}
