import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category code uniqueness enforcement to prevent duplicate category
 * identifiers.
 *
 * This test validates referential integrity and system consistency by:
 *
 * 1. Creating a moderator account for administrative access
 * 2. Creating an initial category with a specific unique code
 * 3. Attempting to create a second category with the same code
 * 4. Verifying the duplicate creation fails with appropriate error handling
 * 5. Ensuring database consistency and meaningful error feedback
 *
 * The test follows the complete business workflow from moderator registration
 * through category creation attempts, validating that the system properly
 * enforces uniqueness constraints on category codes to maintain data
 * integrity.
 */
export async function test_api_category_creation_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial category with unique code
  const categoryCode = RandomGenerator.alphabets(6);
  const initialCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // Verify initial category was created successfully
  TestValidator.equals(
    "initial category code matches",
    initialCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "initial category is active",
    initialCategory.is_active,
    true,
  );

  // Step 3: Attempt to create second category with same code - should fail
  await TestValidator.error("duplicate category code should fail", async () => {
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  });

  // Step 4: Create a new category with different code to verify system still works
  const differentCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          display_order: 3,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(differentCategory);

  // Verify the new category has a different code than the original
  TestValidator.notEquals(
    "new category has different code than original",
    differentCategory.code,
    categoryCode,
  );
}
