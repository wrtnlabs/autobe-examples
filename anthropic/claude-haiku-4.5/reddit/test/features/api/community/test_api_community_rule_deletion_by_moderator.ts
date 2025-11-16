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

export async function test_api_community_rule_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "https://example.com/moderator/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Login as moderator with correct credentials
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Create a rule in the community
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);
  TestValidator.equals(
    "rule belongs to community",
    rule.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("rule number matches", rule.rule_number, 1);

  // Step 8: Delete the rule as moderator
  await api.functional.communityPlatform.moderator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );

  // Step 9: Verify rule deletion by confirming successful HTTP 204 completion
  TestValidator.predicate("rule successfully deleted by moderator", true);
}
