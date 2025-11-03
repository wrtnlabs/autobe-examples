import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";

/**
 * Validate that an administrator can access detailed karma statistics for any
 * user.
 *
 * The test ensures that:
 *
 * 1. An admin account is created and authenticated.
 * 2. A user account is created by registering a new community (as user
 *    registration is implicit via community creation).
 * 3. The admin retrieves karma statistics for the new user using the admin-only
 *    endpoint.
 * 4. Returned karma stats are correct and fields are accessible for admins.
 * 5. Accessing stats for a non-existent userId returns a business error.
 *
 * Steps:
 *
 * 1. Register an admin account and authenticate as admin.
 * 2. Create a user by creating a community (as only users can create communities).
 * 3. As admin, call the karma stats detail API for that userId.
 * 4. Assert that results are correct according to the user's ID.
 * 5. Try accessing a non-existent userId and assert error is thrown.
 */
export async function test_api_admin_karma_stats_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin account and authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://community-platform.test/admin/join",
    referrer: "https://community-platform.test/login",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminData.email,
  );
  TestValidator.predicate(
    "admin token.access is non-empty string",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2. Create a user by creating a community (as user registration happens implicitly on create)
  const communityData = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);
  const userId = community.creator_user_id;
  TestValidator.predicate(
    "creator_user_id is uuid",
    typeof userId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      ),
  );

  // 3. As admin, retrieve full karma stats for that user
  const karmaStats = await api.functional.communityPlatform.admin.karmaStats.at(
    connection,
    {
      userId,
    },
  );
  typia.assert(karmaStats);
  TestValidator.equals(
    "karmaStats.community_platform_user_id matches userId",
    karmaStats.community_platform_user_id,
    userId,
  );
  TestValidator.predicate(
    "karmaStats.total_karma is int32",
    Number.isInteger(karmaStats.total_karma),
  );

  // 4. Try retrieving stats for non-existent user id
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin karma stats API should fail for non-existent userId",
    async () => {
      await api.functional.communityPlatform.admin.karmaStats.at(connection, {
        userId: fakeUserId,
      });
    },
  );
}
