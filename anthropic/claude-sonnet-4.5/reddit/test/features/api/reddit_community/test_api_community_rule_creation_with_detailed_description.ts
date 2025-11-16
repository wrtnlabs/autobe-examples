import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test community rule creation with comprehensive rule descriptions to validate
 * description field handling.
 *
 * This test verifies that moderators can create community rules with detailed
 * descriptions that include formatting, examples, and enforcement guidelines.
 * It validates various description content scenarios including short
 * descriptions, maximum length descriptions, descriptions with special
 * characters, and null values.
 *
 * Test flow:
 *
 * 1. Register moderator account
 * 2. Create community
 * 3. Create rules with various description types
 * 4. Verify descriptions are stored and retrieved exactly as provided
 */
export async function test_api_community_rule_creation_with_detailed_description(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://reddit-clone.com/register",
        referrer: "https://reddit-clone.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
          icon_url: "https://example.com/icon.png",
          banner_url: "https://example.com/banner.png",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create rule with short description
  const shortDescription = "Be respectful to all members.";
  const rule1: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 1: Respect",
          description: shortDescription,
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  TestValidator.equals(
    "short description matches",
    rule1.description,
    shortDescription,
  );

  // Step 4: Create rule with maximum length description (detailed guideline)
  const maxLengthDescription = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 5,
    wordMax: 10,
  });
  const rule2: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 2: Content Guidelines",
          description: maxLengthDescription,
          rule_number: 2,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  TestValidator.equals(
    "maximum length description matches",
    rule2.description,
    maxLengthDescription,
  );

  // Step 5: Create rule with special characters and Unicode
  const specialCharsDescription =
    "No spam! 🚫 This includes: @mentions, #hashtags, $promotions, & excessive links. Examples: ✓ Good post, ✗ Bad post. Enforcement: 1st warning ⚠️, 2nd temp ban 🔒, 3rd permanent ban 🔨. Contact mods via 📧 email.";
  const rule3: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 3: No Spam",
          description: specialCharsDescription,
          rule_number: 3,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);
  TestValidator.equals(
    "special characters description matches",
    rule3.description,
    specialCharsDescription,
  );

  // Step 6: Create rule with markdown-like formatting intent
  const formattingDescription =
    "**Posting Requirements:**\n\n1. Title must be descriptive\n2. Use appropriate flair\n3. Include [tags] when relevant\n\n*Violation consequences:*\n- First offense: Post removal\n- Second offense: 7-day ban\n- Third offense: Permanent ban\n\n> Please read the full guidelines before posting.\n\nFor questions, contact moderators.";
  const rule4: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 4: Posting Requirements",
          description: formattingDescription,
          rule_number: 4,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule4);
  TestValidator.equals(
    "formatting description matches",
    rule4.description,
    formattingDescription,
  );

  // Step 7: Create rule with null description
  const rule5: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 5: Self-Explanatory Rule",
          description: null,
          rule_number: 5,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule5);
  TestValidator.equals("null description matches", rule5.description, null);

  // Step 8: Create rule with minimal description
  const minimalDescription = "No.";
  const rule6: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: "Rule 6: Minimal",
          description: minimalDescription,
          rule_number: 6,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule6);
  TestValidator.equals(
    "minimal description matches",
    rule6.description,
    minimalDescription,
  );

  // Step 9: Verify all rules were created successfully
  TestValidator.predicate(
    "all rules created",
    rule1.id !== rule2.id &&
      rule2.id !== rule3.id &&
      rule3.id !== rule4.id &&
      rule4.id !== rule5.id &&
      rule5.id !== rule6.id,
  );
}
