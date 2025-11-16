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

export async function test_api_seller_create_sku_for_active_product_with_basic_attributes(
  connection: api.IConnection,
) {
  // 1. Register/authenticate seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create an active multi-SKU product owned by this seller
  const productCode: string = `PRD-${RandomGenerator.alphaNumeric(12)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: null,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match creation request",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "product seller id should match authorized seller",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 3. Create first SKU under the product with minimal valid attributes
  const skuCode1: string = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice1: number = 10000;
  const salePrice1: number = 9000;
  const currency: string = "KRW";

  const skuCreateBody1 = {
    code: skuCode1,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: listPrice1,
    salePrice: salePrice1,
    currency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody1,
    });
  typia.assert<IShoppingMallProductSku>(sku1);

  // 4. Validate SKU response fields and associations
  TestValidator.equals("sku1 code should echo request", sku1.code, skuCode1);
  TestValidator.equals(
    "sku1 name should echo request",
    sku1.name,
    skuCreateBody1.name,
  );
  TestValidator.equals(
    "sku1 listPrice should echo request",
    sku1.listPrice,
    listPrice1,
  );
  TestValidator.equals(
    "sku1 salePrice should echo request",
    sku1.salePrice,
    salePrice1,
  );
  TestValidator.equals(
    "sku1 currency should echo request",
    sku1.currency,
    currency,
  );
  TestValidator.equals(
    "sku1 isActive flag should echo request",
    sku1.isActive,
    true,
  );
  TestValidator.equals(
    "sku1 isPurchasable flag should echo request",
    sku1.isPurchasable,
    true,
  );
  TestValidator.equals(
    "sku1 productCode should match parent product code",
    sku1.productCode,
    product.code,
  );

  TestValidator.equals(
    "sku1 product summary id should match product.id",
    sku1.product.id,
    product.id,
  );
  TestValidator.equals(
    "sku1 product summary name should match product.name",
    sku1.product.name,
    product.name,
  );

  TestValidator.predicate(
    "sku1 createdAt should be a non-empty date-time string",
    !!sku1.createdAt,
  );
  TestValidator.predicate(
    "sku1 updatedAt should be a non-empty date-time string",
    !!sku1.updatedAt,
  );

  // 5. Create a second SKU under the same product to show multiple SKUs are allowed
  const skuCode2: string = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice2: number = 20000;
  const salePrice2: number = 15000;

  const skuCreateBody2 = {
    code: skuCode2,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: listPrice2,
    salePrice: salePrice2,
    currency,
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody2,
    });
  typia.assert<IShoppingMallProductSku>(sku2);

  TestValidator.equals("sku2 code should echo request", sku2.code, skuCode2);
  TestValidator.equals(
    "sku2 productCode should match parent product code",
    sku2.productCode,
    product.code,
  );
  TestValidator.equals(
    "both SKUs should belong to the same product id",
    sku2.product.id,
    product.id,
  );

  // Optional negative test: attempting to create a duplicate SKU code under the same product
  await TestValidator.error(
    "creating a SKU with a duplicate code under the same product should fail",
    async () => {
      const duplicateSkuBody = {
        code: skuCode1,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        listPrice: listPrice1,
        salePrice: salePrice1,
        currency,
        isActive: true,
        isPurchasable: true,
      } satisfies IShoppingMallProductSku.ICreate;

      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: duplicateSkuBody,
        },
      );
    },
  );
}
