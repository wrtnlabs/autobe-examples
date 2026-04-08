import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving a top-level category that has subcategories.
 *
 * Validates the category retrieval endpoint by creating a parent category with
 * subcategories and verifying that the response contains all expected data
 * including the parent details and nested subcategory information.
 *
 * The test flow:
 * 1. Administrator registers/authenticates for admin access
 * 2. Creates a parent category (e.g., 'Electronics')
 * 3. Creates two subcategories under the parent
 * 4. Retrieves the parent category by ID
 * 5. Validates response structure and data integrity
 *
 * Validation checks include HTTP 200 status, correct parent field null value
 * for top-level categories, subcategories array populated with both child
 * categories, accurate subcategory count, and proper schema structure for
 * each subcategory.
 *
 * 1. Admin joins/registers for authentication
 * 2. Create parent category with name and optional description
 * 3. Create first subcategory under parent
 * 4. Create second subcategory under parent
 * 5. Retrieve parent category by ID
 * 6. Validate response matches expected structure and data
 */
export async function test_api_category_retrieval_top_level_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create first subcategory
  const subcategory1 =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory1);
  // 4. Create second subcategory
  const subcategory2 =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Portable computers",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory2);
  // 5. Retrieve parent category by ID
  const retrievedCategory = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(retrievedCategory);
  // 6. Validate response structure and data
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "description included",
    retrievedCategory.description,
    "Electronic devices and accessories",
  );
  TestValidator.equals(
    "parent is null for top-level category",
    retrievedCategory.parent,
    null,
  );
  TestValidator.equals(
    "subcategories_count matches",
    retrievedCategory.subcategories_count,
    2,
  );
  TestValidator.equals(
    "subcategories array length",
    retrievedCategory.subcategories.length,
    2,
  );
  // Validate first subcategory
  TestValidator.equals(
    "first subcategory name",
    retrievedCategory.subcategories[0].name,
    "Smartphones",
  );
  TestValidator.equals(
    "first subcategory has id",
    retrievedCategory.subcategories[0].id,
    subcategory1.id,
  );
  // Validate second subcategory
  TestValidator.equals(
    "second subcategory name",
    retrievedCategory.subcategories[1].name,
    "Laptops",
  );
  TestValidator.equals(
    "second subcategory has id",
    retrievedCategory.subcategories[1].id,
    subcategory2.id,
  );
  // Validate each subcategory has proper ITree structure (id, name, description, children)
  for (const sub of retrievedCategory.subcategories) {
    TestValidator.predicate("subcategory has id", sub.id !== undefined);
    TestValidator.predicate("subcategory has name", sub.name !== undefined);
    TestValidator.predicate(
      "subcategory has children array",
      Array.isArray(sub.children),
    );
  }
}
