import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test error handling when attempting to unsubscribe from a non-existent
 * community.
 *
 * This test validates that the API properly handles requests to unsubscribe
 * from communities that do not exist in the system. It ensures proper
 * validation and error responses are returned when invalid community
 * identifiers are provided.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a new member account
 * 2. Generate a random community name that does not exist
 * 3. Attempt to unsubscribe from the non-existent community
 * 4. Verify that the operation fails with an appropriate error
 */
export async function test_api_community_unsubscription_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate a random community name that does not exist
  const nonexistentCommunityName = `nonexistent_community_${RandomGenerator.alphaNumeric(16)}`;

  // Step 3 & 4: Attempt to unsubscribe from non-existent community and verify error
  await TestValidator.error(
    "unsubscribe from non-existent community should fail",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.erase(
        connection,
        {
          communityName: nonexistentCommunityName,
        },
      );
    },
  );
}
