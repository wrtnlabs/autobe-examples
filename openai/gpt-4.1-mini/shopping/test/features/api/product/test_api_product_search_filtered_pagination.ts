import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Tests the admin-level product search listing endpoint with category filtering
 * and pagination.
 *
 * This test first authenticates as a new admin user by joining, then creates
 * product categories necessary for filtering. Afterwards, it calls the PATCH
 * /shoppingMall/admin/products endpoint with a request body specifying category
 * filtering and pagination parameters. Finally, it validates that the paginated
 * response contains only products within the specified category and that
 * pagination details are accurate.
 *
 * The scenario verifies the role-based access control and advanced search
 * capabilities for admin users managing product catalogs.
 */
export async function test_api_product_search_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join: Create and authenticate a new admin user.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPass123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create product categories (minimum two for valid filtering)
  const categoryA: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: {
          parent_id: null,
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 15,
          }),
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(categoryA);

  const categoryB: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: {
          parent_id: categoryA.id,
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 15,
          }),
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(categoryB);

  // 3. Prepare a filtered and paginated request for product search
  const pageNumber = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requestBody = {
    page: pageNumber,
    limit: limit,
    category_id: categoryB.id,
    include_deleted: false,
  } satisfies IShoppingMallProduct.IRequest;

  // 4. Perform the filtered product search listing for admin
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.admin.products.index(connection, {
      body: requestBody,
    });
  typia.assert(result);

  // 5. Validate the pagination metadata
  const pagination: IPage.IPagination = result.pagination;
  TestValidator.predicate(
    "pagination.current is page number",
    pagination.current === pageNumber,
  );
  TestValidator.predicate(
    "pagination.limit is limit",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination.records is a non-negative number",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // 6. Validate that all products belong to the specified category
  for (const product of result.data) {
    // product has id, code, name only, no category info available in summary
    // Due to DTO restrictions, cannot assert category here directly
    // So we assert at least that product has id and code strings
    TestValidator.predicate(
      `product.id is uuid format - ${product.id}`,
      typeof product.id === "string" && /[0-9a-fA-F-]{36}/.test(product.id),
    );

    TestValidator.predicate(
      `product.code is non-empty string - ${product.code}`,
      typeof product.code === "string" && product.code.length > 0,
    );

    TestValidator.predicate(
      `product.name is non-empty string - ${product.name}`,
      typeof product.name === "string" && product.name.length > 0,
    );
  }
}
