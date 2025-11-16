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

export async function test_api_community_rule_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create a category as administrator
  const adminMember = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminMember);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create a member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);

  // Step 3: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);

  // Step 5: Create a community rule
  const ruleTitle = RandomGenerator.paragraph({ sentences: 1 });
  const ruleDescription = RandomGenerator.paragraph({ sentences: 2 });
  const ruleNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();

  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: ruleNumber,
          title: ruleTitle,
          description: ruleDescription,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 6: Create an unauthenticated connection for public access test
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // Step 7: Retrieve the rule publicly (without authentication)
  const retrievedRule =
    await api.functional.communityPlatform.communities.rules.at(
      publicConnection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  typia.assert(retrievedRule);

  // Step 8: Validate all expected fields are present and correct
  TestValidator.equals(
    "retrieved rule ID matches created rule",
    retrievedRule.id,
    rule.id,
  );

  TestValidator.equals(
    "retrieved rule community ID matches",
    retrievedRule.community_platform_community_id,
    community.id,
  );

  TestValidator.equals(
    "retrieved rule number matches",
    retrievedRule.rule_number,
    ruleNumber,
  );

  TestValidator.equals(
    "retrieved rule title matches",
    retrievedRule.title,
    ruleTitle,
  );

  TestValidator.equals(
    "retrieved rule description matches",
    retrievedRule.description,
    ruleDescription,
  );

  TestValidator.predicate(
    "rule has valid creation timestamp",
    retrievedRule.created_at !== null && retrievedRule.created_at !== undefined,
  );

  TestValidator.predicate(
    "rule has valid update timestamp",
    retrievedRule.updated_at !== null && retrievedRule.updated_at !== undefined,
  );

  TestValidator.predicate(
    "rule number is within valid range 1-10",
    retrievedRule.rule_number >= 1 && retrievedRule.rule_number <= 10,
  );
}
