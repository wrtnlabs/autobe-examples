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

export async function test_api_community_rule_deletion_moderator_unauthorized(
  connection: api.IConnection,
) {
  // Setup: Create administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Setup: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create first moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = RandomGenerator.alphabets(12);
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: moderator1Password,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // Setup: Create second moderator (not assigned to community)
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = RandomGenerator.alphabets(12);
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: moderator2Password,
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Setup: Create member account to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/auth/member/join",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Setup: Create community via member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Authenticate as moderator1 and create a rule
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: moderator1Password,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Switch to moderator2 who is not authorized to manage this community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test: Attempt to delete rule as unauthorized moderator (should fail with 403)
  await TestValidator.error(
    "unauthorized moderator should not be able to delete community rule",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
}
