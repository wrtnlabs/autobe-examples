import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test that category creation properly prevents duplicate category codes.
 *
 * This test validates the uniqueness constraint on category codes in the
 * economic discussion platform. The workflow includes:
 *
 * 1. Register a moderator account for authentication
 * 2. Create an initial category with a unique code
 * 3. Attempt to create a second category with the same code
 * 4. Verify that the duplicate creation attempt is properly rejected
 *
 * The test ensures that the platform maintains data integrity by preventing
 * duplicate category codes, which are used for URL generation and
 * identification.
 */
export async function test_api_moderator_category_duplicate_code_validation(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(16), // Generate proper password hash
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial category with unique code
  const categoryCode = `test-category-${typia.random<string & tags.Format<"uuid">>()}`;
  const originalCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(originalCategory);

  // Verify the original category was created successfully
  TestValidator.equals(
    "original category code",
    originalCategory.code,
    categoryCode,
  );

  // Step 3: Attempt to create duplicate category with same code
  await TestValidator.error(
    "should reject duplicate category code",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: categoryCode, // Same code as original
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            display_order: 2,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );
}
