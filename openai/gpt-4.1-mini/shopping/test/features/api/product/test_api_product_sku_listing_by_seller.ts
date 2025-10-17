import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingMallSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallSku";

export async function test_api_product_sku_listing_by_seller(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Seller signs up
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: RandomGenerator.alphaNumeric(12),
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;

  // Using Admin connection to create seller (system setup)
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 3. Create a product category
  const categoryCreateBody = {
    parent_id: null,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 4. Seller joins/authenticates (simulate login, to set auth token)
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuth);

  // 5. Seller creates product
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Seller lists SKUs for the created product with pagination and filters

  // Compose SKU filter parameters
  const skuRequestBody = {
    shopping_mall_product_id: product.id,
    sku_code: undefined,
    status: undefined,
    min_price: undefined,
    max_price: undefined,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallShoppingMallSku.IRequest;

  const skuPage: IPageIShoppingMallShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: skuRequestBody,
    });
  typia.assert(skuPage);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page at least 1",
    skuPage.pagination.current >= 1,
  );
  TestValidator.equals("pagination limit", skuPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    skuPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    skuPage.pagination.pages >= 1,
  );

  // Validate SKUs returned correspond to the product
  for (const sku of skuPage.data) {
    typia.assert(sku);
    TestValidator.predicate(
      "SKU id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sku.id,
      ),
    );
    TestValidator.predicate(
      "SKU status string not empty",
      typeof sku.status === "string" && sku.status.length > 0,
    );
    TestValidator.predicate(
      "SKU price number non-negative",
      typeof sku.price === "number" && sku.price >= 0,
    );
    TestValidator.predicate(
      "SKU code string not empty",
      typeof sku.sku_code === "string" && sku.sku_code.length > 0,
    );
  }
  // 7. Authorization: Trying to list SKUs with random unauthorized productId should yield error
  await TestValidator.error(
    "SKU listing fails for unauthorized product",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.index(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: skuRequestBody,
      });
    },
  );
}
