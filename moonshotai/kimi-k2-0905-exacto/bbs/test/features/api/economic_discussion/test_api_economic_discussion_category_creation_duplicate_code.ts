import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category creation with duplicate category codes to validate uniqueness
 * constraints in the system. This ensures that the system properly prevents
 * multiple categories with the same code and maintains data integrity in the
 * category taxonomy system. The test should create a category, then attempt to
 * create another with the same code to verify proper rejection.
 */
export async function test_api_economic_discussion_category_creation_duplicate_code(
  connection: api.IConnection,
) {
  // Step 1: Register as a moderator to get authentication and authorization
  const moderatorData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    moderation_level: "admin", // Assuming admin level for category creation
    email_verified: true,
    two_factor_enabled: false,
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create initial category with unique code
  const categoryCode = RandomGenerator.alphabets(8);
  const initialCategoryData = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const firstCategory: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: initialCategoryData,
      },
    );
  typia.assert(firstCategory);

  // Verify the first category was created successfully
  TestValidator.equals(
    "first category code matches",
    firstCategory.code,
    categoryCode,
  );
  TestValidator.predicate(
    "first category has id",
    firstCategory.id !== null &&
      typia.is<string & tags.Format<"uuid">>(firstCategory.id),
  );

  // Step 3: Attempt to create another category with the same code
  const duplicateCategoryData = {
    code: categoryCode, // Same code as first category
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: false, // Different active status
  } satisfies IEconomicDiscussionCategory.ICreate;

  // This should fail due to duplicate code
  await TestValidator.error(
    "duplicate category code should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: duplicateCategoryData,
        },
      );
    },
  );

  // Step 4: Verify that a category with different code still works
  const differentCategoryData = {
    code: RandomGenerator.alphabets(10), // Different code
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const differentCategory: IEconomicDiscussionCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: differentCategoryData,
      },
    );
  typia.assert(differentCategory);

  // Verify the different category was created successfully
  TestValidator.equals(
    "different category code matches",
    differentCategory.code,
    differentCategoryData.code,
  );
  TestValidator.predicate(
    "different category has id",
    differentCategory.id !== null &&
      typia.is<string & tags.Format<"uuid">>(differentCategory.id),
  );
  TestValidator.notEquals(
    "categories have different ids",
    firstCategory.id,
    differentCategory.id,
  );
}
