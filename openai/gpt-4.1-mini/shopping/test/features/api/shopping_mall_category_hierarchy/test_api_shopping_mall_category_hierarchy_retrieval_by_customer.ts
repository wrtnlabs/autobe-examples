import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_category_hierarchy_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Customer registration and authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";
  const createCustomerBody = {
    email: email,
    password: password,
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: createCustomerBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2. Fetch category hierarchy detail
  // Use random values for required path parameters
  const categoryName: string = typia.random<string>();
  const hierarchyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const hierarchyLink: IShoppingMallCategoryHierarchy =
    await api.functional.shoppingMall.customer.shoppingMallCategories.shoppingMallCategoryHierarchies.at(
      connection,
      {
        categoryName: categoryName,
        shoppingMallCategoryHierarchyId: hierarchyId,
      },
    );
  typia.assert(hierarchyLink);

  // Step 3. Validate response data integrity and consistency
  TestValidator.predicate(
    "parent category name is a non-empty string",
    typeof hierarchyLink.parent_category_name === "string" &&
      hierarchyLink.parent_category_name.length > 0,
  );

  TestValidator.predicate(
    "child category name is a non-empty string",
    typeof hierarchyLink.child_category_name === "string" &&
      hierarchyLink.child_category_name.length > 0,
  );

  TestValidator.predicate(
    "is_active is boolean",
    typeof hierarchyLink.is_active === "boolean",
  );

  TestValidator.predicate(
    "display_order is number or undefined",
    hierarchyLink.display_order === undefined ||
      typeof hierarchyLink.display_order === "number",
  );

  TestValidator.predicate(
    "notes is string or undefined",
    hierarchyLink.notes === undefined ||
      typeof hierarchyLink.notes === "string",
  );
}
