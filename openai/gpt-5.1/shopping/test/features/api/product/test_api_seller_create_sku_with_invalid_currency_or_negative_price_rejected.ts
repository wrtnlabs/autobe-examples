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

export async function test_api_seller_create_sku_with_invalid_currency_or_negative_price_rejected(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a multi-SKU product for this seller
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 3-a. Attempt SKU creation with invalid currency code but otherwise non-negative prices
  const invalidCurrencySkuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 1000,
    salePrice: 900,
    currency: "XYZ", // invalid ISO currency in business terms but type-correct
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error(
    "SKU creation with invalid currency code should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: invalidCurrencySkuBody,
        },
      );
    },
  );

  // 3-b. Attempt SKU creation with negative prices but valid currency
  const negativePriceSkuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: -1000,
    salePrice: -500,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  await TestValidator.error(
    "SKU creation with negative prices should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: negativePriceSkuBody,
        },
      );
    },
  );

  // 4. Successful SKU creation with valid currency and non-negative prices
  const validSkuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 1000,
    salePrice: 800,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: validSkuBody,
    });
  typia.assert<IShoppingMallProductSku>(createdSku);

  TestValidator.equals(
    "created SKU code matches requested code",
    createdSku.code,
    validSkuBody.code,
  );
  TestValidator.equals(
    "created SKU productCode matches parent product code",
    createdSku.productCode,
    product.code,
  );
  TestValidator.equals(
    "created SKU currency matches requested currency",
    createdSku.currency,
    validSkuBody.currency,
  );
  TestValidator.equals(
    "created SKU listPrice matches requested listPrice",
    createdSku.listPrice,
    validSkuBody.listPrice,
  );
  TestValidator.equals(
    "created SKU salePrice matches requested salePrice",
    createdSku.salePrice,
    validSkuBody.salePrice,
  );
}
