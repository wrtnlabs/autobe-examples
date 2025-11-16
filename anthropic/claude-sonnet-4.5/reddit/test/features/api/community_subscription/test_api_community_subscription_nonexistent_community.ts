import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test error handling when attempting to subscribe to a nonexistent community.
 *
 * This test validates that the system properly rejects subscription attempts to
 * communities that do not exist in the database. A member account is created
 * and authenticated, then attempts to subscribe to a community using a randomly
 * generated name that is guaranteed not to exist.
 *
 * The test ensures the API returns an appropriate error response (likely 404
 * Not Found) when the specified community cannot be found, preventing invalid
 * subscription records and providing clear feedback to clients about the
 * failure reason.
 *
 * Steps:
 *
 * 1. Create and authenticate a new member account
 * 2. Generate a random nonexistent community name
 * 3. Attempt to subscribe to the nonexistent community
 * 4. Verify that the operation fails with an appropriate error
 */
export async function test_api_community_subscription_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Generate a random nonexistent community name
  const nonexistentCommunityName = `nonexistent_community_${RandomGenerator.alphaNumeric(20)}_${Date.now()}`;

  // Step 3 & 4: Attempt to subscribe to nonexistent community and verify error
  await TestValidator.error(
    "subscription to nonexistent community should fail",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        { communityName: nonexistentCommunityName },
      );
    },
  );
}
