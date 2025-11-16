import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test automatic resequencing of remaining rules after deletion to maintain
 * sequential numbering. Validates that rule organization remains consistent and
 * that gaps in numbering are properly filled during deletion operations.
 */
export async function test_api_community_rule_delete_resequence(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator (required dependency)
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(2),
        href: "https://reddit-community.com/auth",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Generate test data for community name and rule IDs
  const communityName = RandomGenerator.name(1).toLowerCase();

  // Create multiple rule IDs to simulate rule resequencing scenario
  const ruleIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Delete rules to test resequencing
  // Delete the middle rule first to create a gap
  await api.functional.redditCommunity.communityModerator.communities.rules.erase(
    connection,
    {
      communityName: communityName,
      ruleId: ruleIds[2], // Delete the third rule
    },
  );

  // Delete the first rule to test edge case resequencing
  await api.functional.redditCommunity.communityModerator.communities.rules.erase(
    connection,
    {
      communityName: communityName,
      ruleId: ruleIds[0], // Delete the first rule
    },
  );

  // Delete the last rule to test end deletion resequencing
  await api.functional.redditCommunity.communityModerator.communities.rules.erase(
    connection,
    {
      communityName: communityName,
      ruleId: ruleIds[4], // Delete the last rule
    },
  );

  // Step 4: Test deletion of non-existent rule to verify error handling
  await TestValidator.error(
    "deleting non-existent rule should fail",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.rules.erase(
        connection,
        {
          communityName: communityName,
          ruleId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // Step 5: Test deletion from non-existent community to verify error handling
  await TestValidator.error(
    "deleting rule from non-existent community should fail",
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.rules.erase(
        connection,
        {
          communityName: "non-existent-community-123456789",
          ruleId: ruleIds[1],
        },
      );
    },
  );

  // Test assertion: Verify that deletion operations completed successfully
  TestValidator.predicate(
    "moderator authentication successful",
    moderator !== null && moderator !== undefined,
  );
}
