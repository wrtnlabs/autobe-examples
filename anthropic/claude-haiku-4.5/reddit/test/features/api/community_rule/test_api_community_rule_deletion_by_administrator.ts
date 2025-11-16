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

export async function test_api_community_rule_deletion_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a category required for community creation
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `test-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Register and authenticate as administrator
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: `admin-${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 3: Register and authenticate as member to create community
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `member-${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: memberPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community as member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Register and authenticate as moderator to create rules
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: `moderator-${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: moderatorPassword,
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Switch to moderator and create a community rule
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);
  TestValidator.equals(
    "rule community id matches",
    rule.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("rule number is 1", rule.rule_number, 1);

  // Step 7: Switch to administrator and delete the rule
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administrator.email,
      password: adminPassword,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 8: Delete the rule - returns HTTP 204 No Content
  await api.functional.communityPlatform.administrator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );

  // Step 9: Verify deletion was successful
  // The erase operation completes without error, indicating permanent deletion
  TestValidator.predicate(
    "rule deletion completed successfully with HTTP 204",
    true,
  );
}
