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

export async function test_api_seller_create_sku_with_duplicate_code_for_same_product_rejected(
  connection: api.IConnection,
) {
  // If running in simulate mode, uniqueness constraints cannot be meaningfully tested
  // because NestiaSimulator.random() will always return mock success responses.
  // In that case, we only execute the happy path once and return.
  if (connection.simulate === true) {
    const sellerJoinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      storeName: RandomGenerator.name(2),
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest;

    const authorizedSeller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: sellerJoinBody,
      });
    typia.assert(authorizedSeller);

    const productCreateBody = {
      shopping_mall_seller_id: authorizedSeller.id,
      shopping_mall_brand_id: null,
      code: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(3),
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: true,
      primary_image_uri: null,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productCreateBody,
      });
    typia.assert(product);

    const skuCode = RandomGenerator.alphaNumeric(10);

    const skuCreateBody = {
      code: skuCode,
      name: `${product.name} SKU 1`,
      listPrice: 10000,
      salePrice: 8000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);

    return;
  }

  // 1. Register a seller and obtain authenticated context
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(authorizedSeller);

  // 2. Create a multi-SKU product owned by this seller
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: authorizedSeller.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 3. Create the first SKU with a specific code under this product
  const duplicatedSkuCode = RandomGenerator.alphaNumeric(10);

  const firstSkuBody = {
    code: duplicatedSkuCode,
    name: `${product.name} SKU 1`,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const firstSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: firstSkuBody,
    });
  typia.assert(firstSku);

  TestValidator.equals(
    "first SKU code matches requested code",
    firstSku.code,
    duplicatedSkuCode,
  );

  // 4. Attempt to create a second SKU with the same code under the same product
  const secondSkuBody = {
    code: duplicatedSkuCode,
    name: `${product.name} SKU 2`,
    listPrice: 12000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  // 5. Verify that the second creation attempt fails due to uniqueness
  await TestValidator.error(
    "duplicate SKU code per product must be rejected",
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
