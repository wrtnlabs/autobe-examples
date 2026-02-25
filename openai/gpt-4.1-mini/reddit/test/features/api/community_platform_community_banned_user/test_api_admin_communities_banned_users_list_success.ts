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

export async function test_api_admin_communities_banned_users_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a community with adminConnection as user actor
  // Since only user actor can create a community, we create a user actor for that
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Use adminConnection to call banned users list endpoint
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityBannedUser.IRequest;
  // 4. Call the banned users list
  const bannedUsersPage =
    await api.functional.communityPlatform.admin.communities.banned_users.list.index(
      adminConnection,
      {
        communityId: community.id,
        body: requestBody,
      },
    );
  typia.assert(bannedUsersPage);
  // 5. Validate pagination meta
  TestValidator.predicate(
    "pagination current page is 1",
    bannedUsersPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    bannedUsersPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is greater than or equal to 0",
    bannedUsersPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination total records is greater than or equal to 0",
    bannedUsersPage.pagination.records >= 0,
  );
  // 6. Validate each banned user record fields and types
  for (const bannedUser of bannedUsersPage.data) {
    typia.assert(bannedUser);
    typia.assert(bannedUser.user);
    TestValidator.predicate("bannedAt field is ISO date string", () => {
      const date = new Date(bannedUser.bannedAt);
      return !isNaN(date.getTime());
    });
    TestValidator.predicate(
      "banReason field is non-empty string",
      typeof bannedUser.banReason === "string" &&
        bannedUser.banReason.length > 0,
    );
    // Validate user summary fields
    TestValidator.predicate(
      "user id field is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bannedUser.user.id,
      ),
    );
    TestValidator.predicate(
      "user username field is non-empty string",
      typeof bannedUser.user.username === "string" &&
        bannedUser.user.username.length > 0,
    );
    TestValidator.predicate(
      "user displayName field is non-empty string",
      typeof bannedUser.user.displayName === "string" &&
        bannedUser.user.displayName.length > 0,
    );
    if (
      bannedUser.user.avatarUrl !== null &&
      bannedUser.user.avatarUrl !== undefined
    ) {
      TestValidator.predicate(
        "user avatarUrl field is string or null",
        typeof bannedUser.user.avatarUrl === "string",
      );
    }
  }
  // 7. Additional search filter test
  // If there are banned users, pick one and search by username or banReason
  if (bannedUsersPage.data.length > 0) {
    const sampleUser = bannedUsersPage.data[0];
    const searchTerm =
      sampleUser.user.username.substring(0, 3) ||
      sampleUser.banReason.substring(0, 3);
    if (searchTerm.length > 0) {
      const searchRequestBody = {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies ICommunityPlatformCommunityBannedUser.IRequest;
      const searchResult =
        await api.functional.communityPlatform.admin.communities.banned_users.list.index(
          adminConnection,
          {
            communityId: community.id,
            body: searchRequestBody,
          },
        );
      typia.assert(searchResult);
      // Validate that all returned banned user records contain the search term in either username or banReason
      for (const bannedUser of searchResult.data) {
        const usernameContains = bannedUser.user.username.includes(searchTerm);
        const banReasonContains = bannedUser.banReason.includes(searchTerm);
        TestValidator.predicate(
          "banned user record contains search term in username or banReason",
          usernameContains || banReasonContains,
        );
      }
    }
  }
}
