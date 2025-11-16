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
 * Test retrieval with an invalid rule ID format.
 *
 * This test validates that the API properly handles attempts to retrieve
 * community rules with correct UUID format but potentially non-existent rule
 * IDs, demonstrating proper error handling for legitimate business logic
 * scenarios rather than type validation errors.
 */
export async function test_api_community_rule_retrieval_invalid_rule_id(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member for testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to test rule retrieval
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_name: "general",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Attempt to retrieve a community rule using a valid UUID format
  // but that likely doesn't exist (since we haven't created any rules)
  const nonExistentRuleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return error for non-existent rule ID",
    async () => {
      await api.functional.redditCommunity.communities.rules.getRule(
        connection,
        {
          communityName: community.name,
          ruleId: nonExistentRuleId,
        },
      );
    },
  );
}
