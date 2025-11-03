import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test the retrieval of a list of SKUs associated with a product by an
 * authenticated admin.
 *
 * This test verifies the full end-to-end flow including admin registration,
 * login, product creation, and SKU listing.
 *
 * Steps:
 *
 * 1. Register a new admin with a unique email, password, and full name.
 * 2. Log in as the registered admin to obtain authorization tokens.
 * 3. Create a new product with a unique product code and name.
 * 4. Retrieve a paginated list of SKUs for the created product using the admin's
 *    authorization.
 * 5. Verify that the pagination metadata is valid and the SKU list contains
 *    correct details.
 */
export async function test_api_product_skus_index_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";
  const adminFullName = RandomGenerator.name(3);

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(joinedAdmin);

  // 2. Login as the registered admin
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new product
  const productCode: string = `PRD${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const productName = RandomGenerator.name(3);

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: null,
        brand: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);

  // 4. Retrieve SKUs list for the product
  const skuPage: IPageIShoppingMallProductSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productCode: productCode,
      body: {
        page: 1,
        limit: 10,
        search: null,
        sortField: null,
        sortOrder: null,
      } satisfies IShoppingMallProductSku.IRequest,
    });
  typia.assert(skuPage);

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be positive",
    skuPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    skuPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages should be zero or positive",
    skuPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    skuPage.pagination.records >= 0,
  );

  // 6. Validate SKU list items
  for (const sku of skuPage.data) {
    typia.assert(sku);
    TestValidator.predicate("sku id is UUID", /^[0-9a-f-]{36}$/i.test(sku.id));
    TestValidator.predicate(
      "sku_code is non-empty",
      typeof sku.sku_code === "string" && sku.sku_code.length > 0,
    );
    TestValidator.predicate("sku price is positive", sku.price >= 0);
  }
}
