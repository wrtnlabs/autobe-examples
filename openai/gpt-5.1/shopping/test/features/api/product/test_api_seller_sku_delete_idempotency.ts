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

export async function test_api_seller_sku_delete_idempotency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a multi-SKU product owned by this seller
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: RandomGenerator.alphaNumeric(16),
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
    { body: productBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a SKU under the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuBody,
    },
  );
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. First deletion must succeed without error
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: sku.code,
  });

  // 5. Second deletion: verify idempotent behavior by requiring that
  //    the second call also completes without throwing.
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productCode: product.code,
    skuCode: sku.code,
  });

  // 6. Business assertion: we at least confirm that product & sku codes retain
  //    their original values locally to avoid accidental mutation.
  TestValidator.equals(
    "product code remains stable in test context",
    product.code,
    productBody.code,
  );
  TestValidator.equals(
    "sku code remains stable in test context",
    sku.code,
    skuBody.code,
  );
}
