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
 * Test creation of a rule with a duplicate rule number within the same
 * community. This scenario validates that the system prevents duplicate rule
 * numbers within communities, ensuring unique rule ordering and preventing
 * conflicts in community governance structure.
 *
 * Test flow:
 *
 * 1. Create community moderator account for rule creation authority
 * 2. Create member account for community ownership
 * 3. Create a community under the member account
 * 4. Switch to moderator account and create first rule
 * 5. Attempt to create second rule - should get next sequential number
 * 6. Validate that rule numbering is handled automatically by the system
 */
export async function test_api_community_rule_creation_duplicate_rule_number(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/moderator/join",
        referrer: "https://reddit-community.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create member account for community ownership
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "MemberPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a community under the member account
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Switch to moderator account and create first rule
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "https://reddit-community.com/moderator/login",
      referrer: "https://reddit-community.com/home",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const firstRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Be respectful to all community members",
          description:
            "Treat all members with respect. No personal attacks, harassment, or discriminatory language will be tolerated.",
          violation_consequence:
            "Warning for first offense, temporary suspension for repeated violations",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(firstRule);
  TestValidator.predicate(
    "First rule should have valid rule number",
    firstRule.rule_number >= 1 && firstRule.rule_number <= 15,
  );

  // Step 5: Create second rule - system should handle numbering automatically
  const secondRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: "No spam or self-promotion",
          description:
            "Do not post spam, excessive self-promotion, or irrelevant content. Share valuable contributions only.",
          violation_consequence: "Content removal and warning",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(secondRule);
  TestValidator.predicate(
    "Second rule should have valid rule number",
    secondRule.rule_number >= 1 && secondRule.rule_number <= 15,
  );
  TestValidator.notEquals(
    "Rule IDs should be different",
    firstRule.id,
    secondRule.id,
  );
  TestValidator.equals(
    "Both rules should belong to same community",
    firstRule.reddit_community_community_id,
    secondRule.reddit_community_community_id,
  );

  // Validate that the system handles rule numbering automatically without conflicts
  TestValidator.predicate(
    "Rules should have different rule numbers",
    firstRule.rule_number !== secondRule.rule_number,
  );
}
