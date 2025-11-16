import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test partial update of community rule where only some fields are modified.
 *
 * This test validates that the update operation supports partial updates,
 * allowing moderators to change only specific aspects of a rule without
 * affecting other fields. The test creates a rule with title, description, and
 * rule_number, then updates only the description field while leaving title and
 * rule_number unchanged. It verifies that only the specified field is modified
 * while unspecified fields retain their original values. This ensures flexible
 * rule editing capabilities.
 */
export async function test_api_community_rule_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphaNumeric(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a rule with complete data
  const originalTitle = "Original Rule Title";
  const originalDescription = "Original detailed description of the rule";
  const originalRuleNumber = 1;

  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: originalTitle,
          description: originalDescription,
          rule_number: originalRuleNumber,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Verify the rule was created with correct initial values
  TestValidator.equals(
    "created rule title matches",
    createdRule.title,
    originalTitle,
  );
  if (
    createdRule.description !== null &&
    createdRule.description !== undefined
  ) {
    TestValidator.equals(
      "created rule description matches",
      createdRule.description,
      originalDescription,
    );
  }
  TestValidator.equals(
    "created rule number matches",
    createdRule.rule_number,
    originalRuleNumber,
  );

  // Step 4: Perform partial update - only update the description field
  const newDescription = "Updated description with new content";

  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: createdRule.id,
        body: {
          description: newDescription,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Validate partial update results
  if (
    updatedRule.description !== null &&
    updatedRule.description !== undefined
  ) {
    TestValidator.equals(
      "description was updated",
      updatedRule.description,
      newDescription,
    );
  }
  TestValidator.equals(
    "title remains unchanged",
    updatedRule.title,
    originalTitle,
  );
  TestValidator.equals(
    "rule number remains unchanged",
    updatedRule.rule_number,
    originalRuleNumber,
  );
  TestValidator.equals(
    "rule ID remains the same",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "community ID remains the same",
    updatedRule.community_id,
    createdRule.community_id,
  );

  // Verify that updated_at timestamp changed
  const createdTime = new Date(createdRule.updated_at).getTime();
  const updatedTime = new Date(updatedRule.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp changed after update",
    updatedTime >= createdTime,
  );
}
