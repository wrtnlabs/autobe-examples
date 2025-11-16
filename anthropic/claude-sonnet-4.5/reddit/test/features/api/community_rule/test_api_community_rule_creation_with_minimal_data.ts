import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test community rule creation using only required fields, omitting optional
 * description.
 *
 * This test validates that the API correctly handles optional fields by
 * creating a community rule with only the required title and rule_number
 * fields, without providing the optional description field.
 *
 * Steps:
 *
 * 1. Register a moderator account for authentication
 * 2. Create a community to which the rule will be added
 * 3. Create a rule with only required fields (title and rule_number)
 * 4. Verify that the rule is created successfully with null description
 * 5. Validate that the rule is functional and properly stored
 */
export async function test_api_community_rule_creation_with_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create rule with minimal data (only required fields)
  const ruleNumber = typia.random<number & tags.Type<"int32">>();
  const ruleTitle = "No spam or self-promotion";

  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          rule_number: ruleNumber,
          // Intentionally omitting description to test minimal data creation
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Step 4: Validate rule creation success with business logic checks
  TestValidator.equals("rule title matches", createdRule.title, ruleTitle);
  TestValidator.equals(
    "rule number matches",
    createdRule.rule_number,
    ruleNumber,
  );
  TestValidator.equals(
    "rule community ID matches",
    createdRule.community_id,
    community.id,
  );

  // Step 5: Verify description is null when not provided (business logic validation)
  TestValidator.equals(
    "description is null for minimal data",
    createdRule.description,
    null,
  );
}
