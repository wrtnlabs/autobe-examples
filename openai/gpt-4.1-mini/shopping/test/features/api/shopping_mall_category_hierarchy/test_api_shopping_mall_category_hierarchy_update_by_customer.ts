import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_category_hierarchy_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer join and authenticate to obtain authorization token
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/signup?email=${RandomGenerator.alphaNumeric(8)}`,
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(customer);

  // 2. Create a new shopping mall category
  const categoryCreateBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IShoppingMallShoppingMallCategory.ICreate;
  const category: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Create a category hierarchy link under the category
  const hierarchyCreateBody = {
    child_category_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallCategoryHierarchy.ICreate;
  const hierarchy: IShoppingMallCategoryHierarchy =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.create(
      connection,
      {
        categoryName: category.name,
        body: hierarchyCreateBody,
      },
    );
  typia.assert(hierarchy);

  // 4. Update the hierarchy link with new properties
  const hierarchyUpdateBody = {
    parent_category_name: category.name,
    child_category_name: category.name, // Use original category name for consistency
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: false,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategoryHierarchy.IUpdate;
  const updatedHierarchy: IShoppingMallCategoryHierarchy =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.update(
      connection,
      {
        categoryName: category.name,
        shoppingMallCategoryHierarchyId: hierarchy.id,
        body: hierarchyUpdateBody,
      },
    );
  typia.assert(updatedHierarchy);

  // Validate updated properties
  TestValidator.equals(
    "Updated parent category name equals original category name",
    updatedHierarchy.parent_category_name,
    category.name,
  );
  TestValidator.equals(
    "Updated display order equals input",
    updatedHierarchy.display_order,
    hierarchyUpdateBody.display_order,
  );
  TestValidator.equals(
    "Updated is_active equals input",
    updatedHierarchy.is_active,
    hierarchyUpdateBody.is_active,
  );
  TestValidator.equals(
    "Updated notes equals input",
    updatedHierarchy.notes,
    hierarchyUpdateBody.notes,
  );
}
