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
 * Test that rule description update respects the length validation constraints
 * (10-200 characters).
 *
 * This test validates community rule description field constraints
 * independently:
 *
 * - Descriptions shorter than 10 characters are rejected (HTTP 400)
 * - Descriptions longer than 200 characters are rejected (HTTP 400)
 * - Descriptions at boundary values (exactly 10 and 200) are accepted
 * - Description validation works independently from title validation
 *
 * Test flow:
 *
 * 1. Setup: Create administrator account
 * 2. Setup: Create category for community classification
 * 3. Setup: Create member account for community creation
 * 4. Setup: Create community
 * 5. Setup: Switch to moderator and create initial rule with valid data
 * 6. Test Case 1: Update rule with 9-character description (too short) - expect
 *    400
 * 7. Test Case 2: Update rule with 201-character description (too long) - expect
 *    400
 * 8. Test Case 3: Update rule with exactly 10-character description - expect
 *    success
 * 9. Test Case 4: Update rule with exactly 200-character description - expect
 *    success
 * 10. Verify: Confirm final rule has the last valid 200-character description
 */
export async function test_api_community_rule_update_description_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icon.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
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

  // Step 5: Create moderator and create initial rule
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Switch to moderator to create rule
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const initialRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 5,
          }),
          description: "Valid initial description for testing",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(initialRule);

  // Switch back to member for rule updates
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test Case 1: Update with 9-character description (too short) - should fail
  const tooShortDesc = "123456789"; // Exactly 9 characters
  await TestValidator.error(
    "9-character description should fail with 400",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: initialRule.id,
          body: {
            description: tooShortDesc,
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );

  // Test Case 2: Update with 201-character description (too long) - should fail
  const tooLongDesc = "a".repeat(201); // Exactly 201 characters
  await TestValidator.error(
    "201-character description should fail with 400",
    async () => {
      await api.functional.communityPlatform.member.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: initialRule.id,
          body: {
            description: tooLongDesc,
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );

  // Test Case 3: Update with exactly 10-character description - should succeed
  const minValidDesc = "1234567890"; // Exactly 10 characters
  const updatedMin =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          description: minValidDesc,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedMin);
  TestValidator.equals(
    "updated rule should have 10-character description",
    updatedMin.description,
    minValidDesc,
  );

  // Test Case 4: Update with exactly 200-character description - should succeed
  const maxValidDesc = "b".repeat(200); // Exactly 200 characters
  const updatedMax =
    await api.functional.communityPlatform.member.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: initialRule.id,
        body: {
          description: maxValidDesc,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(updatedMax);
  TestValidator.equals(
    "updated rule should have 200-character description",
    updatedMax.description,
    maxValidDesc,
  );

  // Verify: Confirm final rule has correct description
  TestValidator.predicate(
    "final description should be exactly 200 characters",
    updatedMax.description.length === 200,
  );
}
