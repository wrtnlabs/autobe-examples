import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_variant_unauthorized_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // === ADMIN SETUP ===
  // Admin account needed to approve sellers for product operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // === SELLER A SETUP (product owner) ===
  // Create and approve Seller A who will own the product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: `ShopA-${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  // Admin approves Seller A to enable product creation
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerA.id,
  });
  // Seller A creates a product that will be the target of authorization test
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // === SELLER B SETUP (unauthorized seller) ===
  // Create and approve Seller B who will attempt unauthorized variant creation
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: `ShopB-${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  // Admin approves Seller B (approval alone does not grant access to other sellers' products)
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerB.id,
  });
  // === MAIN TEST: Authorization Enforcement ===
  // Seller B attempts to create a variant for Seller A's product
  // Expected result: 403 Forbidden (seller does not own this product)
  await TestValidator.httpError(
    "unauthorized seller cannot create variant for another seller's product",
    403,
    async () => {
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerBConnection,
        {
          params: {
            productId: product.id,
          },
          body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            optionValues: [{ key: "color", value: "Red" }],
          },
        },
      );
    },
  );
  // === POSITIVE CONTROL ===
  // Verify Seller A CAN create variants for their own product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "size", value: "M" }],
        },
      },
    );
  typia.assert(variant);
  // Verify the created variant belongs to the correct product
  TestValidator.equals(
    "variant belongs to correct product",
    variant.product.id,
    product.id,
  );
}