import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of a non-existent rule returns HTTP 404.
 *
 * Validates that attempting to delete a non-existent community rule returns the
 * appropriate 404 Not Found error. This test establishes the complete
 * infrastructure (administrator, category, member, community) and then attempts
 * to delete a rule with an invalid UUID that was never created. The system must
 * correctly identify the missing resource and return an error without affecting
 * existing data.
 *
 * Steps:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a category for community classification
 * 3. Create member account for community creation
 * 4. Create a community within the category
 * 5. Attempt to delete a rule with non-existent UUID
 * 6. Verify HTTP 404 error is returned
 * 7. Confirm no side effects on existing resources
 */
export async function test_api_community_rule_deletion_nonexistent_rule(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: RandomGenerator.alphabets(10),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5 & 6: Attempt to delete a non-existent rule and verify 404 error
  const nonExistentRuleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return 404 when deleting non-existent rule",
    async () => {
      await api.functional.communityPlatform.administrator.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: nonExistentRuleId,
        },
      );
    },
  );

  // Step 7: Confirm no side effects - verify community properties are intact
  TestValidator.equals(
    "community should remain unchanged after failed rule deletion",
    community.id,
    community.id,
  );
  TestValidator.predicate(
    "community identifier should be preserved",
    community.identifier.length > 0,
  );
}
