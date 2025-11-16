import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that seller-created products with multi-SKU flag are persisted
 * correctly.
 *
 * Business goal: Ensure that when a seller registers on the platform and
 * creates a catalog product with `is_multi_sku` set to true, the resulting
 * `IShoppingMallProduct` returned by the write model reflects the flag
 * correctly and is wired to the authenticated seller. Because only seller join
 * and seller product create endpoints are available, read-after-write
 * consistency is validated solely via the create response, not via separate
 * catalog read APIs.
 *
 * Scenario steps:
 *
 * 1. Register a new seller via POST /auth/seller/join to obtain an authenticated
 *    seller session.
 * 2. Using the authenticated seller context, create a new product via POST
 *    /shoppingMall/seller/products with a unique business-visible `code` and
 *    `is_multi_sku` set to true.
 * 3. Assert that the returned `IShoppingMallProduct` satisfies the following:
 *
 *    - `is_multi_sku` is true.
 *    - `code` echoes the requested code.
 *    - `seller.id` matches the authorized seller id from the join step.
 *    - Core read-only fields like `id` and timestamps are present and type-correct
 *         (validated with typia.assert).
 * 4. Optionally, create a second product for the same seller with `is_multi_sku`
 *    set to false to contrast behavior and ensure the flag can differ across
 *    products owned by the same seller.
 *
 * Error scenarios around invalid types or missing fields are intentionally not
 * tested because they would violate TypeScript type safety. The focus is on
 * happy-path business behavior and flag consistency in the returned DTO.
 */
export async function test_api_seller_product_creation_multi_sku_flag_consistency(
  connection: api.IConnection,
) {
  // 1. Register a new seller to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Basic sanity checks on seller summary
  TestValidator.equals(
    "seller summary id matches top-level id",
    authorizedSeller.id,
    authorizedSeller.seller.id,
  );
  TestValidator.equals(
    "seller summary email matches top-level email",
    authorizedSeller.email,
    authorizedSeller.seller.email,
  );

  // 2. Create a multi-SKU product for this seller
  const productCodeMultiSku: string = `PROD-${RandomGenerator.alphaNumeric(12)}`;

  const createMultiSkuBody = {
    shopping_mall_seller_id: authorizedSeller.id,
    shopping_mall_brand_id: undefined,
    code: productCodeMultiSku,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const multiSkuProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createMultiSkuBody,
    });
  typia.assert<IShoppingMallProduct>(multiSkuProduct);

  // 3. Validate business invariants for multi-SKU product
  TestValidator.equals(
    "multi-sku product code echoes request code",
    multiSkuProduct.code,
    productCodeMultiSku,
  );
  TestValidator.predicate(
    "multi-sku flag should be true on created product",
    multiSkuProduct.is_multi_sku === true,
  );
  TestValidator.equals(
    "product seller id matches authorized seller id",
    multiSkuProduct.seller.id,
    authorizedSeller.id,
  );

  // 4. Create a single-SKU product for contrast (is_multi_sku=false)
  const productCodeSingleSku: string = `PROD-${RandomGenerator.alphaNumeric(12)}`;

  const createSingleSkuBody = {
    shopping_mall_seller_id: authorizedSeller.id,
    shopping_mall_brand_id: undefined,
    code: productCodeSingleSku,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const singleSkuProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createSingleSkuBody,
    });
  typia.assert<IShoppingMallProduct>(singleSkuProduct);

  TestValidator.equals(
    "single-sku product code echoes request code",
    singleSkuProduct.code,
    productCodeSingleSku,
  );
  TestValidator.predicate(
    "single-sku flag should be false on created product",
    singleSkuProduct.is_multi_sku === false,
  );
  TestValidator.equals(
    "single-sku product seller id matches authorized seller id",
    singleSkuProduct.seller.id,
    authorizedSeller.id,
  );

  // Final cross-check: the two products should differ in both id and is_multi_sku
  TestValidator.notEquals(
    "multi-sku and single-sku products must have different ids",
    multiSkuProduct.id,
    singleSkuProduct.id,
  );
  TestValidator.notEquals(
    "multi-sku and single-sku flags should differ",
    multiSkuProduct.is_multi_sku,
    singleSkuProduct.is_multi_sku,
  );
}
