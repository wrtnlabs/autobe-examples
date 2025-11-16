import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test retrieval of a specific community rule by its unique identifier.
 *
 * This test validates that community rules can be accessed publicly without
 * authentication, ensuring transparency of community guidelines. The test
 * creates a community, adds a rule to it, and then retrieves that specific rule
 * to verify all fields are returned correctly including title, description,
 * rule number, and timestamps.
 *
 * Steps:
 *
 * 1. Create moderator account with valid credentials
 * 2. Create a new community as the moderator
 * 3. Add a rule to the community
 * 4. Retrieve the specific rule by ID (public access)
 * 5. Validate all rule fields match the created rule
 */
export async function test_api_community_rule_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new community
  const communityName = RandomGenerator.alphabets(10);
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

  // Step 3: Add a rule to the community
  const ruleTitle = "Be respectful to all members";
  const ruleDescription =
    "Treat all community members with respect and kindness. Personal attacks, harassment, and discriminatory language will not be tolerated.";
  const ruleNumber = 1;

  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          rule_number: ruleNumber,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Step 4: Retrieve the specific rule by ID (public endpoint - no auth required)
  const retrievedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.communities.rules.at(connection, {
      communityName: community.name,
      ruleId: createdRule.id,
    });
  typia.assert(retrievedRule);

  // Step 5: Validate all rule fields
  TestValidator.equals(
    "retrieved rule ID matches created rule",
    retrievedRule.id,
    createdRule.id,
  );
  TestValidator.equals("rule title matches", retrievedRule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    retrievedRule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "rule number matches",
    retrievedRule.rule_number,
    ruleNumber,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedRule.community_id,
    community.id,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedRule.created_at,
    createdRule.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedRule.updated_at,
    createdRule.updated_at,
  );
}
