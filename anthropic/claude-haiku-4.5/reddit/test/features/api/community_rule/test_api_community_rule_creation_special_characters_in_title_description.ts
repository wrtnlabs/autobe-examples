import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_rule_creation_special_characters_in_title_description(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category-" + RandomGenerator.alphaNumeric(6),
          description: "Test category for special characters",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: "member_" + RandomGenerator.alphaNumeric(6),
        password: "MemberPassword123!",
        href: "https://example.com/member/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: "test-comm-" + RandomGenerator.alphaNumeric(6),
          description: "Community for testing special characters in rules",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: "mod_" + RandomGenerator.alphaNumeric(6),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create community rules with special characters
  // Rule 1: Punctuation and parentheses
  const rule1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: "No Spam/Ads (Commercial)",
          description:
            "Do not post spam or commercial advertisements. This includes referral links and promotional content.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  TestValidator.equals(
    "rule 1 title preserves special characters",
    rule1.title,
    "No Spam/Ads (Commercial)",
  );

  // Rule 2: Dashes and hyphens
  const rule2: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 2,
          title: "Respect All Members---No Bullying",
          description:
            "Treat all members with respect. Zero-tolerance for harassment, bullying, or personal attacks.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);
  TestValidator.equals(
    "rule 2 title preserves hyphens",
    rule2.title,
    "Respect All Members---No Bullying",
  );

  // Rule 3: Parentheses and character mix
  const rule3: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 3,
          title: "Keep It Family-Friendly (PG-13)",
          description:
            "Content must be appropriate for all ages. No explicit language, violence, or adult content.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);
  TestValidator.equals(
    "rule 3 title preserves family-friendly designation",
    rule3.title,
    "Keep It Family-Friendly (PG-13)",
  );

  // Rule 4: Special symbols in title
  const rule4: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 4,
          title: "Stay On-Topic™",
          description:
            "Posts must be relevant to the community topic. Off-topic content is not allowed: use @mentions and #tags appropriately.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule4);
  TestValidator.equals(
    "rule 4 title preserves trademark symbol",
    rule4.title,
    "Stay On-Topic™",
  );

  // Rule 5: Various punctuation marks
  const rule5: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 5,
          title: "Be Courteous!?!",
          description:
            "Use punctuation responsibly with periods, commas, question marks, and exclamation marks properly placed.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule5);
  TestValidator.equals(
    "rule 5 title preserves multiple punctuation",
    rule5.title,
    "Be Courteous!?!",
  );

  // Rule 6: Mathematical and special operators
  const rule6: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 6,
          title: "Math Symbols: ±×÷=",
          description:
            "Allowed special characters include common mathematical operators and formatting symbols in discussions.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule6);
  TestValidator.equals(
    "rule 6 title preserves mathematical symbols",
    rule6.title,
    "Math Symbols: ±×÷=",
  );

  // Rule 7: Quotes and apostrophes
  const rule7: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 7,
          title: "Use 'Correct' \"Quotation\" Marks",
          description:
            "Always use proper grammar and quotation marks when citing other members or sources.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule7);
  TestValidator.equals(
    "rule 7 title preserves quotation marks and apostrophes",
    rule7.title,
    "Use 'Correct' \"Quotation\" Marks",
  );

  // Rule 8: Slashes in descriptions
  const rule8: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 8,
          title: "Use Proper Paths/URLs",
          description:
            "When sharing URLs or paths, ensure they are properly formatted and complete.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule8);
  TestValidator.equals(
    "rule 8 title preserves slashes",
    rule8.title,
    "Use Proper Paths/URLs",
  );

  // Verification: All special characters are preserved
  TestValidator.predicate(
    "all rules were created successfully with special characters",
    rule1.id !== null &&
      rule2.id !== null &&
      rule3.id !== null &&
      rule4.id !== null &&
      rule5.id !== null &&
      rule6.id !== null &&
      rule7.id !== null &&
      rule8.id !== null,
  );
}
