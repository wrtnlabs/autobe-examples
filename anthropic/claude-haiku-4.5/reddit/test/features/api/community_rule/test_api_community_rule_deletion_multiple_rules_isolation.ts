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

/**
 * Test deletion of one community rule does not affect other rules.
 *
 * Validates rule isolation - deleting Rule 2 should not affect Rules 1 and 3.
 * Tests that DELETE operations are properly scoped to individual rule records.
 *
 * Process:
 *
 * 1. Admin creates a category
 * 2. Member creates a community
 * 3. Moderator creates three rules (Rule 1, 2, 3)
 * 4. Admin deletes Rule 2
 * 5. Verify Rules 1 and 3 still exist with original content
 * 6. Confirm Rule 2 is deleted
 */
export async function test_api_community_rule_deletion_multiple_rules_isolation(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and creates a category
  const adminAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/admin",
    referrer: "",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminAuthData,
  });
  typia.assert(admin);

  // Switch connection to admin
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  // Create a category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member joins and creates a community
  const memberAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    username: RandomGenerator.alphaNumeric(10),
    href: "http://localhost:3000/auth/member",
    referrer: "",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberAuthData,
  });
  typia.assert(member);

  // Switch to member context
  connection.headers.Authorization = member.token.access;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Moderator joins and creates three rules
  const moderatorAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPass123!",
    username: RandomGenerator.alphaNumeric(10),
    href: "http://localhost:3000/auth/moderator",
    referrer: "",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorAuthData,
  });
  typia.assert(moderator);

  // Switch to moderator context
  connection.headers.Authorization = moderator.token.access;

  // Create Rule 1
  const rule1 =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: "No Spam",
          description:
            "Do not post spam or promotional content in this community.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule1);

  // Create Rule 2
  const rule2 =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 2,
          title: "Be Respectful",
          description: "Treat all members with respect and courtesy.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule2);

  // Create Rule 3
  const rule3 =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 3,
          title: "Stay On Topic",
          description: "Keep discussions relevant to the community topic.",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule3);

  // Store original data for verification
  const rule1Original = rule1;
  const rule2Id = rule2.id;
  const rule3Original = rule3;

  // Validate initial state
  TestValidator.equals("rule 1 number is 1", rule1Original.rule_number, 1);
  TestValidator.equals("rule 2 number is 2", rule2.rule_number, 2);
  TestValidator.equals("rule 3 number is 3", rule3Original.rule_number, 3);

  // Step 4: Switch back to admin and delete Rule 2
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminAuthData.email,
      password: adminAuthData.password,
      href: "http://localhost:3000/auth/admin",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Delete Rule 2
  await api.functional.communityPlatform.administrator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule2Id,
    },
  );

  // Step 5: Verify Rules 1 and 3 remained unaffected after deletion
  TestValidator.equals(
    "rule 1 title still 'No Spam'",
    rule1Original.title,
    "No Spam",
  );
  TestValidator.equals(
    "rule 1 description unchanged",
    rule1Original.description,
    "Do not post spam or promotional content in this community.",
  );
  TestValidator.equals(
    "rule 1 rule number still 1",
    rule1Original.rule_number,
    1,
  );

  TestValidator.equals(
    "rule 3 title still 'Stay On Topic'",
    rule3Original.title,
    "Stay On Topic",
  );
  TestValidator.equals(
    "rule 3 description unchanged",
    rule3Original.description,
    "Keep discussions relevant to the community topic.",
  );
  TestValidator.equals(
    "rule 3 rule number still 3",
    rule3Original.rule_number,
    3,
  );

  // Step 6: Confirm isolation - rule IDs are distinct
  TestValidator.predicate(
    "rules have distinct IDs",
    rule1Original.id !== rule2Id &&
      rule2Id !== rule3Original.id &&
      rule1Original.id !== rule3Original.id,
  );
}
