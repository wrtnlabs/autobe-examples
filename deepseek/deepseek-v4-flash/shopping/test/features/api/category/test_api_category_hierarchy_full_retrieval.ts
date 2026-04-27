import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test full category hierarchy retrieval by an authenticated administrator.
 *
 * Validates that the PATCH hierarchy endpoint returns all non-deleted categories organized in a two-level parent-child structure with proper ordering. Ensures top-level categories are listed first, subcategories are nested under their parent, and all nodes are ordered by created_at ASC within each hierarchy level.
 *
 * 1. Join as an administrator using authorize_administrator_join.
 * 2. Create a top-level category "Electronics".
 * 3. Create a second top-level category "Clothing".
 * 4. Create a subcategory "Smartphones" under Electronics.
 * 5. Create a second subcategory "Laptops" under Electronics.
 * 6. Call PATCH hierarchy endpoint without any name filter.
 * 7. Verify the response structure contains both top-level categories with correct subcategory nesting and ordering.
 */
export async function test_api_category_hierarchy_full_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create top-level category "Electronics"
  const electronics =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(electronics);
  // 3. Create second top-level category "Clothing"
  const clothing =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Clothing",
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(clothing);
  // 4. Create subcategory "Smartphones" under Electronics
  const smartphones =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  // 5. Create subcategory "Laptops" under Electronics
  const laptops =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(laptops);
  // 6. Retrieve full hierarchy without any name filter
  const hierarchy =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      {
        body: {} satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(hierarchy);
  // 7. Validate structure
  // 7.1. Top-level categories count
  TestValidator.equals(
    "top level categories count",
    hierarchy.topLevelCategories.length,
    2,
  );
  // 7.2. Electronics node
  const electronicsNode = hierarchy.topLevelCategories.find(
    (n) => n.name === "Electronics",
  );
  TestValidator.predicate(
    "electronics node exists",
    electronicsNode !== undefined,
  );
  typia.assertGuard(electronicsNode!);
  TestValidator.equals(
    "electronics parent is null",
    electronicsNode.parent,
    null,
  );
  TestValidator.equals(
    "electronics subcategories count",
    electronicsNode.subcategories.length,
    2,
  );
  // 7.3. Clothing node
  const clothingNode = hierarchy.topLevelCategories.find(
    (n) => n.name === "Clothing",
  );
  TestValidator.predicate("clothing node exists", clothingNode !== undefined);
  typia.assertGuard(clothingNode!);
  TestValidator.equals("clothing parent is null", clothingNode.parent, null);
  TestValidator.equals(
    "clothing subcategories count",
    clothingNode.subcategories.length,
    0,
  );
  // 7.4. Subcategories ordered by created_at ASC (Smartphones created before Laptops)
  TestValidator.equals(
    "first subcategory is Smartphones",
    electronicsNode.subcategories[0].name,
    "Smartphones",
  );
  TestValidator.equals(
    "second subcategory is Laptops",
    electronicsNode.subcategories[1].name,
    "Laptops",
  );
  // 7.5. Subcategories have parent reference to Electronics
  const smartphonesNode = electronicsNode.subcategories[0];
  TestValidator.predicate(
    "smartphones has parent reference",
    smartphonesNode.parent !== null,
  );
  typia.assertGuard(smartphonesNode.parent!);
  TestValidator.equals(
    "smartphones parent id matches electronics",
    smartphonesNode.parent!.id,
    electronics.id,
  );
  const laptopsNode = electronicsNode.subcategories[1];
  TestValidator.predicate(
    "laptops has parent reference",
    laptopsNode.parent !== null,
  );
  typia.assertGuard(laptopsNode.parent!);
  TestValidator.equals(
    "laptops parent id matches electronics",
    laptopsNode.parent!.id,
    electronics.id,
  );
  // 7.6. Verify each hierarchy node has required numeric fields
  for (const node of hierarchy.topLevelCategories) {
    TestValidator.equals(
      "top-level products_count is non-negative",
      node.products_count >= 0,
      true,
    );
  }
  for (const node of hierarchy.topLevelCategories[0].subcategories) {
    TestValidator.equals(
      "subcategory products_count is non-negative",
      node.products_count >= 0,
      true,
    );
  }
}
