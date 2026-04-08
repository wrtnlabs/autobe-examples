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
 * Test successful retrieval of subcategories under a parent category.
 *
 * Validates the complete category hierarchy workflow including administrator authentication, parent category creation, subcategory creation, and children retrieval. Ensures that the GET /shoppingMall/categories/{categoryId}/children endpoint returns subcategory data with correct structure and parent references.
 *
 * The test creates a top-level category first, then creates a subcategory under it to verify that the children endpoint properly returns the subcategory with all required fields including id, name, description, parent reference, and created_at timestamp.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Top-level parent category is created with random name and description.
 * 3. A subcategory is created under the parent category.
 * 4. GET /shoppingMall/categories/{categoryId}/children is called with parent ID.
 * 5. Validates response contains the subcategory with correct parent reference.
 * 6. Verifies the subcategory's parent field matches the parent category.
 */
export async function test_api_category_children_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve children of parent category
  const child = await api.functional.shoppingMall.categories.children.iterate(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(child);
  // 5. Validate the returned child has correct parent reference
  TestValidator.predicate("parent exists", child.parent !== null);
  TestValidator.equals(
    "parent id matches",
    child.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    child.parent!.name,
    parentCategory.name,
  );
  // 6. Validate child category has required fields
  TestValidator.notEquals("has id", child.id, "");
  TestValidator.notEquals("has name", child.name, "");
  TestValidator.predicate("has created_at", child.created_at !== undefined);
}
