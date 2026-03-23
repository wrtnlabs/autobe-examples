import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test duplicate name prevention within the same parent scope for shopping mall categories.
 *
 * This test verifies that:
 * 1. Creating a category with a duplicate name under the same parent is rejected (409 conflict)
 * 2. The same category name is allowed under different parent categories (different scopes)
 * 3. Category uniqueness constraint respects the parent_id scope
 */
export async function test_api_category_create_duplicate_name_within_parent_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  // 2. Create first top-level parent category "Home"
  const parentHome = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Home",
        description: "Home and living products",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(parentHome);
  // 3. Create second top-level parent category "Office"
  const parentOffice =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Office",
        description: "Office supplies and equipment",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentOffice);
  // 4. Create subcategory "Electronics" under "Home" - should succeed
  const electronicsUnderHome =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Electronics",
        description: "Electronic devices and accessories",
        parent_id: parentHome.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(electronicsUnderHome);
  // 5. Attempt to create duplicate "Electronics" under "Home" - should fail with 409
  await TestValidator.error(
    "duplicate category name under same parent should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: "Electronics",
            description: "Duplicate electronics category",
            parent_id: parentHome.id,
          } satisfies IShoppingMallCategory.ICreate,
        },
      );
    },
  );
  // 6. Create "Electronics" under "Office" - should succeed (different parent scope)
  const electronicsUnderOffice =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Electronics",
        description: "Office electronics and equipment",
        parent_id: parentOffice.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(electronicsUnderOffice);
  // 7. Validate that both "Electronics" categories exist under different parents
  TestValidator.equals(
    "both electronics categories have same name",
    electronicsUnderHome.name,
    electronicsUnderOffice.name,
  );
  TestValidator.notEquals(
    "electronics categories have different parent IDs",
    electronicsUnderHome.parent?.id,
    electronicsUnderOffice.parent?.id,
  );
  TestValidator.equals(
    "first electronics parent is Home",
    electronicsUnderHome.parent?.id,
    parentHome.id,
  );
  TestValidator.equals(
    "second electronics parent is Office",
    electronicsUnderOffice.parent?.id,
    parentOffice.id,
  );
}
