import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test category creation fails appropriately when target channel is inactive or
 * doesn't exist.
 *
 * This test validates proper error handling and business rule enforcement where
 * categories can only be created within active marketplace channels. Ensures
 * system integrity by preventing orphaned category creation when attempting
 * operations on invalid channels.
 */
export async function test_api_admin_channel_categoryinactive_channel_error(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish authorization for category management
  const name = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `${name.toLowerCase().replace(/\s+/g, "_")}@test.com`,
      firstname: name.split(" ")[0],
      lastname: name.split(" ")[1],
      adminlevel: "department_admin",
      department: "category_management",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Attempt to create category in non-existent channel - should fail with proper error
  await TestValidator.error(
    "creating category in non-existent channel should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.create(
        connection,
        {
          channelCode: typia.random<string & tags.Format<"uuid">>(),
          body: {
            code: "electronics_category",
            name: "Electronics",
            category_type: "primary",
            display_order: 1,
            is_active: true,
          } satisfies IShoppingMallChannelCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Test with obvious invalid channel codes
  await TestValidator.error(
    "creating category with empty channel code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.create(
        connection,
        {
          channelCode: "",
          body: {
            code: "clothing_category",
            name: "Clothing",
            category_type: "primary",
            display_order: 2,
            is_active: true,
          } satisfies IShoppingMallChannelCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Test with malformed channel UUID format
  await TestValidator.error(
    "creating category with malformed channel code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.create(
        connection,
        {
          channelCode: "invalid-uuid-format",
          body: {
            code: "books_category",
            name: "Books",
            category_type: "secondary",
            display_order: 3,
            is_active: true,
          } satisfies IShoppingMallChannelCategory.ICreate,
        },
      );
    },
  );

  // Step 5: Test with nullish channel code values
  await TestValidator.error(
    "creating category with nullish channel code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.create(
        connection,
        {
          channelCode: "null",
          body: {
            code: "nulltest_category",
            name: "Null Test",
            category_type: "testing",
            display_order: 4,
            is_active: true,
          } satisfies IShoppingMallChannelCategory.ICreate,
        },
      );
    },
  );
}
