import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";

/**
 * Verify that an admin can update any user's karma statistics via the platform
 * admin API.
 *
 * 1. Register an admin account and establish admin authentication.
 * 2. Create a community (which provides a new user context for testing via the
 *    creator_user_id).
 * 3. Use the admin karmaStats.update API to set valid aggregate stats (total,
 *    post, comment, lifetime, maximum), with valid business logic (no
 *    negatives, sums align).
 * 4. Validate that the returned stats object reflects the updates, and that no
 *    business constraints are violated (non-negative, proper sums etc).
 * 5. Attempt to update karma stats with a negative value (should fail).
 * 6. Attempt to send a mismatched sum, i.e., post + comment > total (should fail).
 */
export async function test_api_admin_karma_stats_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/admin-join",
    referrer: "https://ref.example.com/",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a user by creating a community (so we get a unique user ID)
  const communityBody = {
    name: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Extract the new userId from creator_user_id
  const userId = community.creator_user_id;

  // 3. Prepare valid karma numbers (all aggregates, non-negative, proper sum alignment)
  const post_karma = 20;
  const comment_karma = 15;
  const total_karma = post_karma + comment_karma;
  const lifetime_karma = total_karma;
  const maximum_karma = total_karma;

  const updateBody = {
    community_platform_user_id: userId,
    total_karma,
    post_karma,
    comment_karma,
    lifetime_karma,
    maximum_karma,
  } satisfies ICommunityPlatformKarmaStats.IUpdate;

  const updatedStats =
    await api.functional.communityPlatform.admin.karmaStats.update(connection, {
      userId,
      body: updateBody,
    });
  typia.assert(updatedStats);

  // 4. Validate fields and business logic
  TestValidator.equals(
    "user id correct",
    updatedStats.community_platform_user_id,
    userId,
  );
  TestValidator.equals(
    "total_karma matches",
    updatedStats.total_karma,
    total_karma,
  );
  TestValidator.equals(
    "post_karma matches",
    updatedStats.post_karma,
    post_karma,
  );
  TestValidator.equals(
    "comment_karma matches",
    updatedStats.comment_karma,
    comment_karma,
  );
  TestValidator.equals(
    "lifetime_karma matches",
    updatedStats.lifetime_karma,
    lifetime_karma,
  );
  TestValidator.equals(
    "maximum_karma matches",
    updatedStats.maximum_karma,
    maximum_karma,
  );
  TestValidator.predicate(
    "all fields non-negative",
    updatedStats.total_karma >= 0 &&
      updatedStats.post_karma >= 0 &&
      updatedStats.comment_karma >= 0 &&
      updatedStats.lifetime_karma >= 0 &&
      updatedStats.maximum_karma >= 0,
  );
  TestValidator.predicate(
    "total_karma >= post_karma + comment_karma",
    updatedStats.total_karma >=
      updatedStats.post_karma + updatedStats.comment_karma,
  );

  // 5. Attempt to set a negative value (should fail)
  const negativeBody = {
    ...updateBody,
    post_karma: -1,
  } satisfies ICommunityPlatformKarmaStats.IUpdate;
  await TestValidator.error("negative karma fails", async () => {
    await api.functional.communityPlatform.admin.karmaStats.update(connection, {
      userId,
      body: negativeBody,
    });
  });

  // 6. Attempt post + comment > total (should fail)
  const invalidSumBody = {
    ...updateBody,
    post_karma: 10,
    comment_karma: 50,
    total_karma: 40, // post + comment = 60 > 40
  } satisfies ICommunityPlatformKarmaStats.IUpdate;
  await TestValidator.error("post + comment > total fails", async () => {
    await api.functional.communityPlatform.admin.karmaStats.update(connection, {
      userId,
      body: invalidSumBody,
    });
  });
}
