import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that a seller can create SKU variants that are inactive or not yet
 * purchasable for staged catalog configuration.
 *
 * Business context:
 *
 * - Sellers often want to pre-configure catalog variants (SKUs) before making
 *   them fully live or purchasable to shoppers.
 * - The system exposes flags on SKU entities: `isActive` (catalog visibility) and
 *   `isPurchasable` (cart/purchase eligibility).
 * - This test ensures that SKUs with `isActive = false` and/or `isPurchasable =
 *   false` can be created and that those flags are persisted as-is, without
 *   being overridden to `true` by any defaulting logic.
 *
 * End-to-end flow:
 *
 * 1. Register a seller via /auth/seller/join to establish an authenticated seller
 *    session.
 * 2. Create a parent product using /shoppingMall/seller/products with
 *    `is_multi_sku = true` so it can host multiple SKU variants.
 * 3. Under that product, create two SKUs via
 *    /shoppingMall/seller/products/{productCode}/skus:
 *
 *    - SKU A: `isActive = false`, `isPurchasable = false` (fully inactive draft)
 *    - SKU B: `isActive = true`, `isPurchasable = false` (visible but not
 *         purchasable)
 * 4. Validate that:
 *
 *    - Each SKU creation succeeds and returns a valid IShoppingMallProductSku.
 *    - The `isActive` and `isPurchasable` flags in the response exactly match the
 *         requested values.
 *    - The `productCode` on the SKU matches the parent product's `code`.
 *    - SKU identifiers and codes are distinct.
 *    - The embedded `product` summary is consistent with the created product.
 */
export async function test_api_seller_create_sku_inactive_or_not_purchasable_for_future_use(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain an authorized seller session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(seller);

  // 2. Create a multi-SKU-capable product for this seller.
  const productRequest = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: `PROD-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productRequest,
    });
  typia.assert(product);

  TestValidator.equals(
    "product seller id should match authenticated seller",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productRequest.code,
  );
  TestValidator.predicate(
    "product is configured as multi-SKU",
    product.is_multi_sku === true,
  );

  // 3. Create SKU A: fully inactive, non-purchasable draft.
  const skuARequest = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: "Draft Variant A",
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: false,
    isPurchasable: false,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuARequest,
    });
  typia.assert(skuA);

  TestValidator.equals(
    "SKU A code should match requested code",
    skuA.code,
    skuARequest.code,
  );
  TestValidator.equals(
    "SKU A name should match requested name",
    skuA.name,
    skuARequest.name,
  );
  TestValidator.equals(
    "SKU A listPrice should match requested listPrice",
    skuA.listPrice,
    skuARequest.listPrice,
  );
  TestValidator.equals(
    "SKU A salePrice should match requested salePrice",
    skuA.salePrice,
    skuARequest.salePrice,
  );
  TestValidator.equals(
    "SKU A currency should match requested currency",
    skuA.currency,
    skuARequest.currency,
  );
  TestValidator.equals(
    "SKU A isActive flag should remain false",
    skuA.isActive,
    false,
  );
  TestValidator.equals(
    "SKU A isPurchasable flag should remain false",
    skuA.isPurchasable,
    false,
  );
  TestValidator.equals(
    "SKU A productCode should match parent product code",
    skuA.productCode,
    product.code,
  );
  TestValidator.equals(
    "SKU A embedded product summary id should match product id",
    skuA.product.id,
    product.id,
  );
  TestValidator.equals(
    "SKU A embedded product summary name should match product name",
    skuA.product.name,
    product.name,
  );

  // 4. Create SKU B: active but not purchasable.
  const skuBRequest = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: "Visible Non-Purchasable Variant B",
    listPrice: 15000,
    salePrice: 12000,
    currency: "KRW",
    isActive: true,
    isPurchasable: false,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBRequest,
    });
  typia.assert(skuB);

  TestValidator.equals(
    "SKU B code should match requested code",
    skuB.code,
    skuBRequest.code,
  );
  TestValidator.equals(
    "SKU B name should match requested name",
    skuB.name,
    skuBRequest.name,
  );
  TestValidator.equals(
    "SKU B listPrice should match requested listPrice",
    skuB.listPrice,
    skuBRequest.listPrice,
  );
  TestValidator.equals(
    "SKU B salePrice should match requested salePrice",
    skuB.salePrice,
    skuBRequest.salePrice,
  );
  TestValidator.equals(
    "SKU B currency should match requested currency",
    skuB.currency,
    skuBRequest.currency,
  );
  TestValidator.equals(
    "SKU B isActive flag should remain true",
    skuB.isActive,
    true,
  );
  TestValidator.equals(
    "SKU B isPurchasable flag should remain false",
    skuB.isPurchasable,
    false,
  );
  TestValidator.equals(
    "SKU B productCode should match parent product code",
    skuB.productCode,
    product.code,
  );
  TestValidator.equals(
    "SKU B embedded product summary id should match product id",
    skuB.product.id,
    product.id,
  );
  TestValidator.equals(
    "SKU B embedded product summary name should match product name",
    skuB.product.name,
    product.name,
  );

  // 5. Cross-SKU consistency checks.
  TestValidator.notEquals(
    "SKU A and SKU B should have different ids",
    skuA.id,
    skuB.id,
  );
  TestValidator.notEquals(
    "SKU A and SKU B should have different codes",
    skuA.code,
    skuB.code,
  );
  TestValidator.equals(
    "Both SKUs should reference the same parent product code",
    skuA.productCode,
    skuB.productCode,
  );
}
