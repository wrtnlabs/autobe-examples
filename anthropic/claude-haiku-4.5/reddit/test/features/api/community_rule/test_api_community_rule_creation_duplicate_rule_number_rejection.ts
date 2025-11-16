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

export async function test_api_community_rule_creation_duplicate_rule_number_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "https://test.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account for rule creation
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Login as moderator to create rules
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Create first rule at position 3
  const firstRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 3,
          title: "No Harassment",
          description:
            "Do not target, insult, or mock other community members.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(firstRule);
  TestValidator.equals("first rule number is 3", firstRule.rule_number, 3);

  // Step 8: Attempt to create duplicate rule at position 3 - should fail
  await TestValidator.error(
    "duplicate rule number should be rejected",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.create(
        connection,
        {
          communityId: community.id,
          body: {
            rule_number: 3,
            title: "Be Respectful",
            description: "Treat all community members with respect.",
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );

  // Step 9: Verify that creating a rule at different position succeeds
  const secondRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 4,
          title: "Stay On Topic",
          description: "Keep discussions relevant to the community purpose.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(secondRule);
  TestValidator.equals("second rule number is 4", secondRule.rule_number, 4);
}
