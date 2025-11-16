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
 * This test validates that the system properly enforces unique category codes
 * by attempting to create categories with duplicate codes. The test ensures the
 * platform prevents duplicate category identifiers and handles conflicts
 * appropriately through proper error handling and validation.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create the first category with a specific code
 * 3. Attempt to create a second category with the identical code
 * 4. Verify the system prevents the duplicate and handles the conflict
 */
export async function test_api_moderator_category_code_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create first category with specific code
  const categoryCode = RandomGenerator.alphabets(10);
  const firstCategory =
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
  typia.assert(firstCategory);

  TestValidator.equals(
    "first category code matches",
    firstCategory.code,
    categoryCode,
  );
  TestValidator.predicate(
    "first category has valid ID",
    firstCategory.id !== null,
  );

  // Step 3: Attempt to create second category with identical code
  await TestValidator.error(
    "duplicate category code should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: categoryCode, // Same code as first category
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            display_order: 2,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Verify first category remains intact and unique
  TestValidator.predicate(
    "first category still exists",
    firstCategory.id !== null,
  );
  TestValidator.equals(
    "first category code unchanged",
    firstCategory.code,
    categoryCode,
  );
}
