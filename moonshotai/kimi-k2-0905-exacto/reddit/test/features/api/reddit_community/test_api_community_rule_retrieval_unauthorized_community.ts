import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test retrieval of a community rule when the community doesn't exist. This
 * scenario validates proper error handling and response when attempting to
 * access a rule in a non-existent community, ensuring the API returns
 * appropriate error codes and messages without exposing internal system
 * details.
 *
 * Steps:
 *
 * 1. Create authenticated member for testing
 * 2. Generate non-existent community name and valid rule ID
 * 3. Attempt to retrieve rule from non-existent community
 * 4. Verify appropriate error is thrown
 * 5. Validate error response structure and content
 */
export async function test_api_community_rule_retrieval_unauthorized_community(
  connection: api.IConnection,
) {
  // Create authenticated member for testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Generate non-existent community name and valid rule ID
  const nonExistentCommunityName = RandomGenerator.alphabets(15);
  const validRuleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve rule from non-existent community
  await TestValidator.error(
    "should throw error for non-existent community",
    async () => {
      await api.functional.redditCommunity.communities.rules.getRule(
        connection,
        {
          communityName: nonExistentCommunityName,
          ruleId: validRuleId,
        },
      );
    },
  );
}
