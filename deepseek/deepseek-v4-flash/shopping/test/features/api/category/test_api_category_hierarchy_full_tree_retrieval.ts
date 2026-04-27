import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_super_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_super_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that a super administrator can retrieve the complete category hierarchy tree containing all non-deleted categories organized as a two-level parent-child structure.
 *
 * Validates that the hierarchy endpoint returns top-level categories each containing their nested subcategories, including a top-level category with no children to confirm an empty subcategories array. Also confirms that top-level categories have a null parent reference while subcategories correctly reference their parent, and that all returned nodes have non-null created_at, updated_at, and null deleted_at fields.
 *
 * 1. Authenticate as a super administrator via the join endpoint.
 * 2. Create three top-level categories (Electronics, Clothing, Books) using the super administrator category creation endpoint.
 * 3. Create subcategories under Electronics (Smartphones, Laptops) and Clothing (Shirts) via the same endpoint with parent_id.
 * 4. Retrieve the full category hierarchy by calling the hierarchy search endpoint with an empty request body.
 * 5. Validate that all three top-level categories appear in the response with correct properties.
 * 6. Validate that Electronics has two subcategories (Smartphones, Laptops).
 * 7. Validate that Clothing has one subcategory (Shirts).
 * 8. Validate that Books has an empty subcategories array.
 * 9. Validate that top-level nodes have null parent and subcategory parent fields reference the correct parent.
 * 10. Validate that all nodes have null deleted_at and non-null created_at and updated_at.
 */
export async function test_api_category_hierarchy_full_tree_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(auth);
  // 2. Create top-level categories
  const electronics =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products and gadgets",
        },
      },
    );
  typia.assert(electronics);
  const clothing =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(clothing);
  const books =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Books",
          description: "Books and publications",
        },
      },
    );
  typia.assert(books);
  // 3. Create subcategories
  const smartphones =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  const laptops =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Laptops",
          description: "Laptop computers",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(laptops);
  const shirts =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Shirts",
          description: "Shirts and tops",
          parent_id: clothing.id,
        },
      },
    );
  typia.assert(shirts);
  // 4. Retrieve the full hierarchy
  const hierarchy =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(hierarchy);
  // 5. Validate hierarchy structure - find nodes by name
  const electronicsNode = hierarchy.topLevelCategories.find(
    (node) => node.name === "Electronics",
  );
  TestValidator.predicate(
    "Electronics top-level node exists",
    () => electronicsNode != null,
  );
  const clothingNode = hierarchy.topLevelCategories.find(
    (node) => node.name === "Clothing",
  );
  TestValidator.predicate(
    "Clothing top-level node exists",
    () => clothingNode != null,
  );
  const booksNode = hierarchy.topLevelCategories.find(
    (node) => node.name === "Books",
  );
  TestValidator.predicate(
    "Books top-level node exists",
    () => booksNode != null,
  );
  // 6. Validate Electronics has two subcategories
  TestValidator.equals(
    "Electronics has 2 subcategories",
    electronicsNode!.subcategories.length,
    2,
  );
  TestValidator.predicate(
    "First Electronics subcategory is Smartphones",
    () => electronicsNode!.subcategories[0]!.name === "Smartphones",
  );
  TestValidator.predicate(
    "Second Electronics subcategory is Laptops",
    () => electronicsNode!.subcategories[1]!.name === "Laptops",
  );
  // 7. Validate Clothing has one subcategory
  TestValidator.equals(
    "Clothing has 1 subcategory",
    clothingNode!.subcategories.length,
    1,
  );
  TestValidator.equals(
    "Clothing subcategory is Shirts",
    clothingNode!.subcategories[0]!.name,
    "Shirts",
  );
  // 8. Validate Books has empty subcategories
  TestValidator.equals(
    "Books has empty subcategories",
    booksNode!.subcategories.length,
    0,
  );
  // 9. Validate parent references
  TestValidator.predicate("all top-level nodes have null parent", () =>
    hierarchy.topLevelCategories.every((node) => node.parent === null),
  );
  TestValidator.equals(
    "Smartphones parent is Electronics",
    electronicsNode!.subcategories[0]!.parent!.id,
    electronics.id,
  );
  TestValidator.equals(
    "Laptops parent is Electronics",
    electronicsNode!.subcategories[1]!.parent!.id,
    electronics.id,
  );
  TestValidator.equals(
    "Shirts parent is Clothing",
    clothingNode!.subcategories[0]!.parent!.id,
    clothing.id,
  );
  // 10. Validate lifecycle fields on all nodes
  for (const node of hierarchy.topLevelCategories) {
    TestValidator.predicate(
      `node "${node.name}" has non-null created_at`,
      () => node.created_at != null,
    );
    TestValidator.predicate(
      `node "${node.name}" has non-null updated_at`,
      () => node.updated_at != null,
    );
    TestValidator.predicate(
      `node "${node.name}" has null deleted_at`,
      () => node.deleted_at === null,
    );
    for (const sub of node.subcategories) {
      TestValidator.predicate(
        `subcategory "${sub.name}" has non-null created_at`,
        () => sub.created_at != null,
      );
      TestValidator.predicate(
        `subcategory "${sub.name}" has non-null updated_at`,
        () => sub.updated_at != null,
      );
      TestValidator.predicate(
        `subcategory "${sub.name}" has null deleted_at`,
        () => sub.deleted_at === null,
      );
    }
  }
}
