import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test updating a community rule's ordering by changing its rule_number.
 *
 * This test validates that moderators can reorder rules to prioritize the most
 * important guidelines. The test creates a community with multiple rules having
 * different rule numbers, then updates one rule's rule_number to change its
 * display position. It verifies that the rule_number is correctly updated while
 * other rule fields remain unchanged.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community to hold the rules
 * 3. Create three rules with sequential rule numbers (1, 2, 3)
 * 4. Update the first rule's rule_number from 1 to 5 to move it down in priority
 * 5. Verify the rule_number was updated correctly
 * 6. Verify other fields (title, description) remain unchanged
 */
export async function test_api_community_rule_update_reordering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community to hold multiple rules
  const communityName = RandomGenerator.alphabets(15);
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

  // Step 3: Create three rules with sequential rule numbers
  const rule1Title = "Be respectful to all members";
  const rule1Description =
    "Treat all community members with respect and courtesy";
  const rule1: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: rule1Title,
          description: rule1Description,
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  TestValidator.equals("rule 1 number should be 1", rule1.rule_number, 1);

  const rule2: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "No spam or self-promotion",
          description: "Do not post spam or excessive self-promotional content",
          rule_number: 2,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  TestValidator.equals("rule 2 number should be 2", rule2.rule_number, 2);

  const rule3: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Stay on topic",
          description: "Keep posts relevant to the community theme",
          rule_number: 3,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);
  TestValidator.equals("rule 3 number should be 3", rule3.rule_number, 3);

  // Step 4: Update the first rule's rule_number from 1 to 5 to reorder it
  const updatedRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.update(
      connection,
      {
        communityName: community.name,
        ruleId: rule1.id,
        body: {
          rule_number: 5,
        } satisfies IRedditCommunityCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Verify the rule_number was updated correctly
  TestValidator.equals(
    "rule_number should be updated to 5",
    updatedRule.rule_number,
    5,
  );

  // Step 6: Verify other fields remain unchanged
  TestValidator.equals(
    "rule ID should remain unchanged",
    updatedRule.id,
    rule1.id,
  );
  TestValidator.equals(
    "rule title should remain unchanged",
    updatedRule.title,
    rule1Title,
  );
  TestValidator.equals(
    "rule description should remain unchanged",
    updatedRule.description,
    rule1Description,
  );
  TestValidator.equals(
    "community_id should remain unchanged",
    updatedRule.community_id,
    community.id,
  );
}
