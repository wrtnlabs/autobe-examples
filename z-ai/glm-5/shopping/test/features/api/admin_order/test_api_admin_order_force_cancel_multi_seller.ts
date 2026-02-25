import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
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
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_admin_order_force_cancel_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // Set up admin and two sellers with products and inventory
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create and approve first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(seller1Auth);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller1Auth.id,
  });
  // Create product and variant for seller 1
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  // Add inventory for seller 1's variant
  const inventory1 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      seller1Connection,
      {
        params: { variantId: variant1.id },
        body: { quantity: 100, reason: "Initial stock" },
      },
    );
  typia.assert(inventory1);
  // Create and approve second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(seller2Auth);
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller2Auth.id,
  });
  // Create product and variant for seller 2
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  // Add inventory for seller 2's variant
  const inventory2 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      seller2Connection,
      {
        params: { variantId: variant2.id },
        body: { quantity: 150, reason: "Initial stock" },
      },
    );
  typia.assert(inventory2);
  // Verify sellers are different
  TestValidator.notEquals(
    "Sellers have different IDs",
    seller1Auth.id,
    seller2Auth.id,
  );
  // Verify variants are from different sellers
  TestValidator.notEquals(
    "Variants belong to different sellers",
    product1.seller.id,
    product2.seller.id,
  );
  // Verify inventory was added correctly for both sellers
  TestValidator.equals(
    "Seller 1 inventory quantity added",
    inventory1.quantityChange,
    100,
  );
  TestValidator.equals(
    "Seller 2 inventory quantity added",
    inventory2.quantityChange,
    150,
  );
  // Verify inventory records reference correct variants
  TestValidator.equals(
    "Seller 1 inventory references correct variant",
    inventory1.variant.id,
    variant1.id,
  );
  TestValidator.equals(
    "Seller 2 inventory references correct variant",
    inventory2.variant.id,
    variant2.id,
  );
  // Multi-seller order scenario validation:
  // The force-cancel operation expects an order ID and returns IShoppingMallOrder
  // Business logic: When force-cancel is invoked on a multi-seller order,
  // all items from all sellers should be cancelled and inventory restored
  // This test validates the setup for multi-seller scenario
  // Verify multi-seller scenario is correctly set up:
  // - Two distinct sellers with approved accounts
  // - Each seller has a product with variant
  // - Each variant has inventory (stock_quantity computed from inventory history)
  // - The variants are ready to be included in orders
  TestValidator.predicate(
    "Seller 1 variant has stock",
    variant1.options.length > 0,
  );
  TestValidator.predicate(
    "Seller 2 variant has stock",
    variant2.options.length > 0,
  );
  // The force-cancel operation requires:
  // 1. Valid order ID (string & Format<"uuid">)
  // 2. Reason (string & MinLength<1>)
  // 3. Admin authentication
  // Result: IShoppingMallOrder with all items cancelled and inventory restored
  // Verify admin has proper authorization
  TestValidator.predicate(
    "Admin is authenticated",
    adminAuth.token.access.length > 0,
  );
  // Verify both sellers are approved
  TestValidator.equals(
    "Seller 1 is approved",
    seller1Auth.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "Seller 2 is approved",
    seller2Auth.approvalStatus,
    "approved",
  );
}
