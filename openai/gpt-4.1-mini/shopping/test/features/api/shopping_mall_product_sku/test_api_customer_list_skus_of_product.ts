import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_customer_list_skus_of_product(
  connection: api.IConnection,
) {
  // 1. Seller signs up
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10); // realistic product code
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          name: productName,
          description: productDescription,
          is_active: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Customer signs up
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer lists SKUs of the product with pagination and filters
  // Use page=1 limit=5, filter active SKUs, price range from 10 to 1000,
  // sorted by price ascending
  const filters = {
    is_active: true,
    price_min: 10,
    price_max: 1000,
  };
  const requestBody: IShoppingMallProductSku.IRequest = {
    page: 1,
    limit: 5,
    filters: filters,
    sort_by: "price",
    order: "asc",
  };

  const pageResult: IPageIShoppingMallProductSku.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallProducts.shoppingMallProductSkus.index(
      connection,
      {
        productCode: productCode,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Verify pagination properties
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    pageResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count >= 1",
    pageResult.pagination.pages >= 1,
  );

  // 6. Verify each SKU belongs to the requested product and filters match
  for (const sku of pageResult.data) {
    // SKU active status matches filter
    TestValidator.equals(
      `sku ${sku.sku_code} is active`,
      sku.is_active,
      filters.is_active,
    );
    // SKU price within filter price range
    TestValidator.predicate(
      `sku ${sku.sku_code} price >= ${filters.price_min}`,
      sku.price >= filters.price_min!,
    );
    TestValidator.predicate(
      `sku ${sku.sku_code} price <= ${filters.price_max}`,
      sku.price <= filters.price_max!,
    );
  }

  // 7. Verify SKU list is sorted by price ascending
  for (let i = 1; i < pageResult.data.length; ++i) {
    TestValidator.predicate(
      `sorted ascending by price at index ${i}`,
      pageResult.data[i - 1].price <= pageResult.data[i].price,
    );
  }
}
