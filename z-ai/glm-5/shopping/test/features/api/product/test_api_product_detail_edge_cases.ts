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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_detail_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create a category for products
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // ===== Scenario 1: Product without variants =====
  // Create product without any variants
  const productWithoutVariants =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: category.id,
        },
      },
    );
  typia.assert(productWithoutVariants);
  // Retrieve product detail - should return product with empty variants array
  const productDetail1 = await api.functional.shoppingMall.products.at(
    connection,
    { productId: productWithoutVariants.id },
  );
  typia.assert(productDetail1);
  // Verify variants array is empty (product shows as unavailable)
  TestValidator.equals(
    "variants empty for unavailable product",
    productDetail1.variants.length,
    0,
  );
  TestValidator.equals(
    "product id matches",
    productDetail1.id,
    productWithoutVariants.id,
  );
  TestValidator.equals(
    "product name matches",
    productDetail1.name,
    productWithoutVariants.name,
  );
  // ===== Scenario 2: Product from suspended seller =====
  // Admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.approvalStatus,
    "suspended",
  );
  // Retrieve product detail - should still be viewable (not 404)
  const productDetail2 = await api.functional.shoppingMall.products.at(
    connection,
    { productId: productWithoutVariants.id },
  );
  typia.assert(productDetail2);
  // Verify product is still viewable
  TestValidator.equals(
    "product still viewable after seller suspension",
    productDetail2.id,
    productWithoutVariants.id,
  );
  TestValidator.equals(
    "seller info present",
    productDetail2.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller approval status reflects suspension",
    productDetail2.seller.approvalStatus,
    "suspended",
  );
}
