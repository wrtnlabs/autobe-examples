import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function test_api_admin_list_product_skus(
  connection: api.IConnection,
) {
  // 1. Admin joins the system, registering credentials and obtaining authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test1234!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Using authorized admin, create a shopping mall product with unique code
  // Generate a unique product code string (e.g. random alphabetic numeric)
  const productCode: string = RandomGenerator.alphaNumeric(8);
  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.name(),
    description: "This is a test product",
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 3. Prepare several SKUs for the product in test - since the API to create SKUs is not given, simulate SKUs and assume at least one SKU exists
  // Instead, proceed to list existing SKUs of the product with a filter

  // 4. List SKUs of the product with pagination and filtering parameters
  const page = 1;
  const limit = 5;
  const filters = { is_active: true, price_min: 0, price_max: 100000 };

  const skuRequest: IShoppingMallProductSku.IRequest = {
    page: page,
    limit: limit,
    filters: filters,
  };

  const skuPage: IPageIShoppingMallProductSku.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallProducts.shoppingMallProductSkus.index(
      connection,
      {
        productCode: productCode,
        body: skuRequest,
      },
    );
  typia.assert(skuPage);

  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination page is correct",
    skuPage.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    skuPage.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages and records non-negative",
    skuPage.pagination.pages >= 0 && skuPage.pagination.records >= 0,
  );

  // 6. Validate SKUs array data
  TestValidator.predicate("SKU data is array", Array.isArray(skuPage.data));
  for (const sku of skuPage.data) {
    typia.assert<IShoppingMallProductSku.ISummary>(sku);
    TestValidator.equals("SKU is active", sku.is_active, true);
    TestValidator.predicate(
      "SKU price within filter range",
      sku.price >= filters.price_min! && sku.price <= filters.price_max!,
    );
  }

  // 7. Additional business validations could be done as needed
}
