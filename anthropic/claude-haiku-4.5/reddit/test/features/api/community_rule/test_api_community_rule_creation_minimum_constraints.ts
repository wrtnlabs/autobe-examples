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

export async function test_api_community_rule_creation_minimum_constraints(
  connection: api.IConnection,
) {
  // 1. Administrator joins and creates a category
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member joins
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Moderator joins
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 6. Create rule with minimum-length title (5 characters) and rule_number 1
  const rule1: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: "Abcde", // exactly 5 characters (minimum)
          description: "1234567890", // exactly 10 characters (minimum)
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);
  TestValidator.equals(
    "rule 1 title should be 5 characters",
    rule1.title,
    "Abcde",
  );
  TestValidator.equals(
    "rule 1 description should be 10 characters",
    rule1.description,
    "1234567890",
  );
  TestValidator.equals("rule 1 number should be 1", rule1.rule_number, 1);

  // 7. Create rule with minimum-length title (5 characters) and rule_number 10 (boundary)
  const rule10: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 10,
          title: "Xyznm", // exactly 5 characters (minimum)
          description: "Abcdefghij", // exactly 10 characters (minimum)
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule10);
  TestValidator.equals(
    "rule 10 title should be 5 characters",
    rule10.title,
    "Xyznm",
  );
  TestValidator.equals(
    "rule 10 description should be 10 characters",
    rule10.description,
    "Abcdefghij",
  );
  TestValidator.equals("rule 10 number should be 10", rule10.rule_number, 10);

  // 8. Verify minimum constraints are enforced
  TestValidator.predicate(
    "minimum title length is 5 characters",
    rule1.title.length >= 5,
  );
  TestValidator.predicate(
    "minimum description length is 10 characters",
    rule1.description.length >= 10,
  );
  TestValidator.predicate(
    "rule_number at boundary 1 is valid",
    rule1.rule_number >= 1,
  );
  TestValidator.predicate(
    "rule_number at boundary 10 is valid",
    rule10.rule_number <= 10,
  );
}
