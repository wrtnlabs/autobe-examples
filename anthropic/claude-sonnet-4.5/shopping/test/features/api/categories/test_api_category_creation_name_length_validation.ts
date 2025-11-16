import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category name field validation boundaries.
 *
 * This test validates that category creation properly enforces name length
 * constraints defined in the IShoppingMallCategory.ICreate type. The category
 * name must be between 2 and 100 characters (MinLength<2> & MaxLength<100>).
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to obtain proper authorization
 * 2. Test valid minimum length: Create category with 2-character name (boundary
 *    valid)
 * 3. Test valid maximum length: Create category with 100-character name (boundary
 *    valid)
 * 4. Test below minimum: Attempt to create category with 1-character name (should
 *    fail validation)
 * 5. Test above maximum: Attempt to create category with 101-character name
 *    (should fail validation)
 */
export async function test_api_category_creation_name_length_validation(
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

  // Step 2: Test valid minimum length (2 characters)
  const minLengthName = RandomGenerator.alphabets(2);
  const categoryMinLength =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: minLengthName,
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryMinLength);
  TestValidator.equals(
    "minimum length category name",
    categoryMinLength.name,
    minLengthName,
  );

  // Step 3: Test valid maximum length (100 characters)
  const maxLengthName = RandomGenerator.alphabets(100);
  const categoryMaxLength =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: maxLengthName,
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(categoryMaxLength);
  TestValidator.equals(
    "maximum length category name",
    categoryMaxLength.name,
    maxLengthName,
  );

  // Step 4: Test below minimum length (1 character - should fail)
  await TestValidator.error(
    "category name below minimum length should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: {
          name: RandomGenerator.alphabets(1),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: typia.random<number & tags.Type<"int32">>(),
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      });
    },
  );

  // Step 5: Test above maximum length (101 characters - should fail)
  await TestValidator.error(
    "category name above maximum length should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(connection, {
        body: {
          name: RandomGenerator.alphabets(101),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: typia.random<number & tags.Type<"int32">>(),
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      });
    },
  );
}
