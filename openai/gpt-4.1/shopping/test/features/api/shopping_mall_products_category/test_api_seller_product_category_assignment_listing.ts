import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductsCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can list category assignments for a product they own.
 *
 * This test follows a minimal business flow:
 *
 * 1. Register a new seller
 * 2. Create a new product under this seller
 * 3. Use the category assignment listing API for this product (results should be
 *    empty initially)
 * 4. Verify response structure, ownership, and that there are no initial
 *    assignments
 */
export async function test_api_seller_product_category_assignment_listing(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-portal.example.com/register",
    referrer: "https://seller-portal.example.com/landing",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerRequestBody,
  });
  typia.assert(sellerAuth);

  // 2. Create a new product as this seller (auth context)
  const createProductBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 12,
    }),
    default_price: 19999,
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: createProductBody },
  );
  typia.assert(product);

  // 3. Query product's category assignments (should be empty)
  const categoriesRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallProductsCategory.IRequest;
  const result =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productId: product.id,
        body: categoriesRequest,
      },
    );
  typia.assert(result);

  // 4. Validate response structure and absence of assignments
  TestValidator.equals(
    "initial category assignment list should be empty",
    result.data,
    [],
  );
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1 satisfies number,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    10 satisfies number,
  );
  TestValidator.equals(
    "total records is 0 on new product",
    result.pagination.records,
    0 satisfies number,
  );
}
