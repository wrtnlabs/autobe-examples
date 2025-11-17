import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

/**
 * Follows the complete scenario for customer-authenticated detailed retrieval
 * of shopping mall category.
 *
 * 1. Customer joins the system by registering their email and password.
 * 2. Using the authenticated customer connection, creates a new shopping mall
 *    category with realistic values.
 * 3. Retrieves the detailed information of the created category by its unique
 *    name.
 * 4. Validates equality of all properties between created and retrieved category
 *    including id, name, description, status, timestamps.
 *
 * Validations include type assertion of API response data and business rule
 * checks to ensure data integrity.
 */
export async function test_api_shopping_mall_category_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins the system
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create shopping mall category
  const categoryName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  })
    .replace(/\s+/g, "-")
    .toLowerCase();
  const categoryDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const categoryStatus = "active";

  const categoryCreateBody = {
    name: categoryName,
    description: categoryDescription,
    status: categoryStatus,
  } satisfies IShoppingMallShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.customer.shoppingMallCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Retrieve category detail by its name
  const retrievedCategory: IShoppingMallShoppingMallCategory =
    await api.functional.shoppingMall.shoppingMallCategories.at(connection, {
      categoryName: createdCategory.name,
    });
  typia.assert(retrievedCategory);

  // 4. Validate all properties
  TestValidator.equals(
    "Category ID should match",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "Category name should match",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "Category description should match",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "Category status should match",
    retrievedCategory.status,
    createdCategory.status,
  );
  TestValidator.equals(
    "Category created_at should match",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "Category updated_at should match",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );
  TestValidator.equals(
    "Category deleted_at should match",
    retrievedCategory.deleted_at,
    createdCategory.deleted_at ?? null,
  );
}
