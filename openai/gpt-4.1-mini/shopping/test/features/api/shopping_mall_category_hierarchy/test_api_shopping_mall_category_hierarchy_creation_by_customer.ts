import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_category_hierarchy_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create the parent category required for the hierarchy
  const parentCategoryBody = {
    name: RandomGenerator.alphaNumeric(5),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IShoppingMallShoppingMallCategory.ICreate;

  const parentCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      { body: parentCategoryBody },
    );
  typia.assert(parentCategory);

  // 3. Create a child category for linking in the hierarchy
  // For test, create another category
  const childCategoryBody = {
    name: RandomGenerator.alphaNumeric(5),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IShoppingMallShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      { body: childCategoryBody },
    );
  typia.assert(childCategory);

  // 4. Create the hierarchy link connecting parent category to child category
  const hierarchyCreateBody = {
    child_category_id: childCategory.id,
  } satisfies IShoppingMallCategoryHierarchy.ICreate;

  const hierarchy: IShoppingMallCategoryHierarchy =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.create(
      connection,
      {
        categoryName: parentCategory.name,
        body: hierarchyCreateBody,
      },
    );
  typia.assert(hierarchy);

  // 5. Validation assertions
  TestValidator.equals(
    "Hierarchy parent category name matches",
    hierarchy.parent_category_name,
    parentCategory.name,
  );

  TestValidator.equals(
    "Hierarchy child category id matches",
    hierarchy.child_category_name,
    childCategory.name,
  );

  TestValidator.predicate("Hierarchy is active", hierarchy.is_active);
}
