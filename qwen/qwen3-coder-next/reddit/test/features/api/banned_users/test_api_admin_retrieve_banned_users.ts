import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBan";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test the admin endpoint for retrieving banned users from a community.
 * Validates admin access control, pagination, and ban record structure.
 */
export async function test_api_admin_retrieve_banned_users(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Create a community for testing using utility function
  const community =
    await generate_random_reddit_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: "Test community for banned users functionality",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve banned users list using the community's ID
  const bannedUsers =
    await api.functional.redditPlatform.admin.communities.banned_users.index(
      adminConnection,
      {
        communityId: (community as any).id,
      },
    );
  typia.assert(bannedUsers);
  // 4. Validate ban records structure
  if (bannedUsers.data.length > 0) {
    for (const ban of bannedUsers.data) {
      typia.assert(ban);
    }
  }
  // 5. Validate pagination structure
  typia.assert(bannedUsers.pagination);
  if (bannedUsers.pagination) {
    // Validate pagination fields
    if (bannedUsers.pagination.current !== undefined) {
      typia.assert(bannedUsers.pagination.current);
    }
    if (bannedUsers.pagination.limit !== undefined) {
      typia.assert(bannedUsers.pagination.limit);
    }
    if (bannedUsers.pagination.records !== undefined) {
      typia.assert(bannedUsers.pagination.records);
    }
    if (bannedUsers.pagination.pages !== undefined) {
      typia.assert(bannedUsers.pagination.pages);
    }
  }
}
