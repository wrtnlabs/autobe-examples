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

export async function test_api_community_rule_update_immutable_rule_number(
  connection: api.IConnection,
) {
  // Step 1: Create a category as administrator
  const adminAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "https://example.com/auth/admin",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: adminAuthData,
  });
  typia.assert(adminAuth);

  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 2: Create a member and community
  const memberAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    href: "https://example.com/auth/member",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberAuthData,
  });
  typia.assert(memberAuth);

  const communityData = {
    name: RandomGenerator.name(),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph(),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create a moderator and authenticate
  const moderatorAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    href: "https://example.com/auth/moderator",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorAuthData,
  });
  typia.assert(moderatorAuth);

  // Step 4: Create a rule with rule_number 3
  const ruleData = {
    rule_number: 3,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  const createdRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleData,
      },
    );
  typia.assert(createdRule);

  TestValidator.equals(
    "created rule_number should be 3",
    createdRule.rule_number,
    3,
  );

  // Step 5: Attempt to update the rule with a different rule_number
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityRule.IUpdate;

  const updatedRule =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: createdRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);

  // Step 6: Verify that rule_number remains immutable (still 3)
  TestValidator.equals(
    "rule_number should remain immutable",
    updatedRule.rule_number,
    createdRule.rule_number,
  );
  TestValidator.equals(
    "rule_number should still be 3",
    updatedRule.rule_number,
    3,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedRule.title,
    createdRule.title,
  );
}
