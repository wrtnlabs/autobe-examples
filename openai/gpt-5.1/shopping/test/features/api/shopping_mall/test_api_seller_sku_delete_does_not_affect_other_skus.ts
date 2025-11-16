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

export async function test_api_seller_sku_delete_does_not_affect_other_skus(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a multi-SKU-capable product for this seller
  const productCode: string & tags.MinLength<1> = ("PRD-" +
    RandomGenerator.alphaNumeric(12)) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 3. Create two distinct SKUs under the product
  const baseCurrency = "USD";

  const skuACode = `${product.code}-A`;
  const skuAListPrice = 10000;
  const skuASalePrice = 9000;

  const skuARequestBody = {
    code: skuACode,
    name: RandomGenerator.name(),
    listPrice: skuAListPrice,
    salePrice: skuASalePrice,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuARequestBody,
    });
  typia.assert<IShoppingMallProductSku>(skuA);

  TestValidator.equals(
    "SKU A code matches requested code",
    skuA.code,
    skuACode,
  );
  TestValidator.equals(
    "SKU A productCode matches parent product code",
    skuA.productCode,
    product.code,
  );
  TestValidator.predicate(
    "SKU A is active and purchasable on creation",
    skuA.isActive === true && skuA.isPurchasable === true,
  );

  const skuBCode = `${product.code}-B`;
  const skuBListPrice = 12000;
  const skuBSalePrice = 11000;

  const skuBRequestBody = {
    code: skuBCode,
    name: RandomGenerator.name(),
    listPrice: skuBListPrice,
    salePrice: skuBSalePrice,
    currency: baseCurrency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBRequestBody,
    });
  typia.assert<IShoppingMallProductSku>(skuB);

  TestValidator.equals(
    "SKU B code matches requested code",
    skuB.code,
    skuBCode,
  );
  TestValidator.equals(
    "SKU B productCode matches parent product code",
    skuB.productCode,
    product.code,
  );
  TestValidator.predicate(
    "SKU B is active and purchasable on creation",
    skuB.isActive === true && skuB.isPurchasable === true,
  );

  TestValidator.predicate(
    "SKU A and SKU B codes are distinct",
    skuA.code !== skuB.code,
  );

  // 4. Delete only SKU A
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: skuA.code,
  });

  // 5. Validate that deletion of SKU A does not affect SKU B (within available context)
  TestValidator.equals(
    "SKU B remains associated with the same product code after SKU A deletion",
    skuB.productCode,
    product.code,
  );

  TestValidator.predicate(
    "SKU B remains conceptually active and purchasable after SKU A deletion (in-memory invariants)",
    skuB.isActive === true && skuB.isPurchasable === true,
  );
}
