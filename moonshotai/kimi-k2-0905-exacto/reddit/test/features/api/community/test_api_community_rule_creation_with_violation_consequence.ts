import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community rule creation with violation consequences to validate
 * governance capabilities.
 *
 * This test establishes a complete workflow demonstrating how community
 * moderators can create comprehensive rule systems that include both behavioral
 * guidelines and specific enforcement consequences. The scenario ensures that
 * moderators have the tools to establish clear expectations and maintain
 * community standards through well-defined violation penalties.
 *
 * Test flow:
 *
 * 1. Create and authenticate a community moderator account
 * 2. Create a new community where rules will be established
 * 3. Create a community rule with specific violation consequences
 * 4. Validate the rule creation and enforcement mechanisms
 */
export async function test_api_community_rule_creation_with_violation_consequence(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "securePassword123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com/communities",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== undefined,
  );

  // Step 2: Create a community for rule establishment
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: communityTitle,
        description: communityDescription,
        category_name: "general",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals("community type is public", community.type, "public");

  // Step 3: Create community rule with violation consequences
  const ruleTitle = "No Spam or Self-Promotion";
  const ruleDescription =
    "Posts and comments must provide value to the community. Excessive self-promotion, spam, or repetitive content will be removed. Members should contribute meaningfully to discussions rather than solely promoting their own content.";
  const violationConsequence =
    "First offense results in a warning, second offense leads to post removal, repeated violations may result in a temporary or permanent ban from the community.";

  const communityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          violation_consequence: violationConsequence,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(communityRule);

  // Step 4: Validate rule creation and properties
  TestValidator.equals(
    "rule title matches input",
    communityRule.title,
    ruleTitle,
  );
  TestValidator.equals(
    "rule description matches input",
    communityRule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "violation consequence matches input",
    communityRule.violation_consequence,
    violationConsequence,
  );
  TestValidator.equals(
    "rule belongs to correct community",
    communityRule.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate(
    "rule has valid ID format",
    communityRule.id !== undefined && communityRule.id.length === 36,
  );
  TestValidator.predicate(
    "rule has sequential number",
    communityRule.rule_number >= 1 && communityRule.rule_number <= 15,
  );
  TestValidator.predicate(
    "rule has creation timestamp",
    communityRule.created_at !== undefined,
  );
  TestValidator.predicate(
    "rule has update timestamp",
    communityRule.updated_at !== undefined,
  );

  // Step 5: Test creating additional rules without violation consequences
  const ruleTitleNoConsequence = "Be Respectful";
  const ruleDescriptionNoConsequence =
    "Treat all community members with respect. Personal attacks, harassment, or discriminatory language will not be tolerated. Maintain civil discourse even when disagreeing with others.";

  const communityRuleNoConsequence =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitleNoConsequence,
          description: ruleDescriptionNoConsequence,
          violation_consequence: null, // Explicitly set to null
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(communityRuleNoConsequence);

  TestValidator.equals(
    "rule title without consequence matches",
    communityRuleNoConsequence.title,
    ruleTitleNoConsequence,
  );
  TestValidator.equals(
    "rule description without consequence matches",
    communityRuleNoConsequence.description,
    ruleDescriptionNoConsequence,
  );
  TestValidator.equals(
    "violation consequence is null",
    communityRuleNoConsequence.violation_consequence === null ||
      communityRuleNoConsequence.violation_consequence === undefined,
    true,
  );
}
