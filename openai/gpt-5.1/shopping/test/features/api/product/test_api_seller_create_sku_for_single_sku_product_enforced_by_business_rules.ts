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

export async function test_api_seller_create_sku_for_single_sku_product_enforced_by_business_rules(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a single-SKU product (is_multi_sku = false)
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: null,
    description: null,
    status: "active",
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code should match request code",
    product.code,
    productCode,
  );
  TestValidator.predicate(
    "created product should be single-SKU (is_multi_sku = false)",
    product.is_multi_sku === false,
  );

  // 3. First SKU creation attempt - should succeed
  const firstSkuCode = `${productCode}-SKU1`;
  const firstSkuBody = {
    code: firstSkuCode,
    name: RandomGenerator.name(),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const firstSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: firstSkuBody,
    });
  typia.assert<IShoppingMallProductSku>(firstSku);

  TestValidator.equals(
    "first SKU productCode should match parent product code",
    firstSku.productCode,
    product.code,
  );
  TestValidator.equals(
    "first SKU code should match request code",
    firstSku.code,
    firstSkuCode,
  );
  TestValidator.predicate(
    "first SKU should be active and purchasable",
    firstSku.isActive === true && firstSku.isPurchasable === true,
  );

  // 4. Second SKU creation attempt - should be rejected by business rules
  const secondSkuCode = `${productCode}-SKU2`;
  const secondSkuBody = {
    code: secondSkuCode,
    name: RandomGenerator.name(),
    listPrice: 11000,
    salePrice: 10000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error(
    "second SKU creation for single-SKU product should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: secondSkuBody,
        },
      );
    },
  );
}
