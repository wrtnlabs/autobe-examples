import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test optional description field with various content lengths.
 *
 * Validates that category creation properly handles the optional description
 * field across different length scenarios: no description (null), short
 * descriptions, and descriptions at the maximum 1000 character limit.
 *
 * This test ensures administrators have flexibility in providing category
 * context while respecting storage constraints defined in the schema.
 *
 * Test Steps:
 *
 * 1. Authenticate as admin for category creation authorization
 * 2. Create category with null description (field omitted)
 * 3. Create category with short description (~50 characters)
 * 4. Create category with maximum length description (1000 characters)
 * 5. Validate all creations succeed and descriptions are stored correctly
 */
export async function test_api_category_creation_description_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category with null description
  const categoryWithoutDescription =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: null,
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryWithoutDescription);
  TestValidator.equals(
    "category without description should have null description",
    categoryWithoutDescription.description,
    null,
  );

  // Step 3: Create category with short description
  const shortDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const categoryWithShortDescription =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: shortDescription,
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryWithShortDescription);
  TestValidator.equals(
    "category with short description should store description correctly",
    categoryWithShortDescription.description,
    shortDescription,
  );

  // Step 4: Create category with maximum length description (1000 characters)
  const maxDescription = RandomGenerator.alphabets(1000);
  const categoryWithMaxDescription =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: maxDescription,
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryWithMaxDescription);
  TestValidator.equals(
    "category with max length description should store full 1000 characters",
    categoryWithMaxDescription.description,
    maxDescription,
  );
  TestValidator.predicate(
    "max description length should be exactly 1000 characters",
    categoryWithMaxDescription.description !== null &&
      categoryWithMaxDescription.description !== undefined &&
      categoryWithMaxDescription.description.length === 1000,
  );
}
