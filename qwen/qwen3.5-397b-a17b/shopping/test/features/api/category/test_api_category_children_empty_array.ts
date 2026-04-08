import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test that retrieving subcategories for a parent category with no children returns an empty array.
 *
 * Validates that the system correctly handles categories without children by returning an empty array instead of errors or null values. An administrator creates a top-level category without any subcategories, then the test verifies the children endpoint returns an empty array for this parent category.
 *
 * This test ensures the category hierarchy API properly handles edge cases where a parent category exists but has no child categories, which is a common scenario in newly created category structures.
 *
 * 1. Administrator authenticates using authorize_admin_join utility function.
 * 2. Administrator creates a top-level category (no parentId) using generate_random_shopping_mall_admin_categories_create utility function.
 * 3. Test calls GET /shoppingMall/categories/{categoryId}/children with the created category's ID.
 * 4. Validates that the response is an empty array (not null, not undefined).
 */
export async function test_api_category_children_empty_array(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a top-level category without subcategories
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 3. Retrieve children for the created category (should be empty)
  const children =
    await api.functional.shoppingMall.categories.children.iterate(
      adminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(children);
  // 4. Validate response is an empty array
  TestValidator.equals(
    "children should be empty array",
    Array.isArray(children) ? children.length : -1,
    0,
  );
}
