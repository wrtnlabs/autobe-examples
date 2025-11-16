import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieval of a non-existent rule within a valid community.
 *
 * This test validates that the API returns appropriate error responses when
 * attempting to access a non-existent rule within an existing community. The
 * test follows a complete workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create a new community to establish the test environment
 * 3. Attempt to retrieve a rule that doesn't exist using a random UUID
 * 4. Verify that the API correctly returns an error indicating the rule was not
 *    found
 *
 * This ensures proper error handling and demonstrates that the system correctly
 * isolates community rules while maintaining security boundaries.
 */
export async function test_api_community_rule_retrieval_nonexistent_rule(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to test within
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: `community_${RandomGenerator.alphabets(8)}`,
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_name: RandomGenerator.pick([
          "Technology",
          "Entertainment",
          "Sports",
          "Science",
        ]),
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Attempt to retrieve a non-existent rule using a random UUID
  const nonexistentRuleId = typia.random<string & tags.Format<"uuid">>();

  // Verify that requesting a non-existent rule throws an error
  await TestValidator.error(
    "retrieving non-existent rule should fail",
    async () => {
      await api.functional.redditCommunity.communities.rules.getRule(
        connection,
        {
          communityName: community.name,
          ruleId: nonexistentRuleId,
        },
      );
    },
  );
}
