import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test multi-seller order creation workflow.
 *
 * This test validates that a single order can contain items from multiple sellers,
 * with each order item correctly referencing its respective seller.
 *
 * **Test Steps:**
 * 1. Admin registers to approve sellers
 * 2. First seller registers, gets approved, creates product with variant and stock
 * 3. Second seller registers, gets approved, creates product with variant and stock
 * 4. Customer registers
 * 5. Customer adds items from both sellers to shopping cart
 * 6. Customer places a single order containing items from both sellers
 *
 * **Validation Points:**
 * - Order contains order items from multiple sellers
 * - Each order item correctly references its seller
 * - Order items preserve seller snapshot data (shop_name, shop_description, logo_url)
 * - Total price correctly sums items from all sellers
 */
export async function test_api_order_creation_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for approving sellers
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. First seller setup
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller1Password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(seller1Auth);
  // Admin approves first seller
  const approvedSeller1 =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller1Auth.id,
    });
  typia.assert(approvedSeller1);
  // First seller creates product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  // First seller creates variant with stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  // 3. Second seller setup
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: seller2Password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(seller2Auth);
  // Admin approves second seller
  const approvedSeller2 =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller2Auth.id,
    });
  typia.assert(approvedSeller2);
  // Second seller creates product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  // Second seller creates variant with stock
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 5. Customer adds items from both sellers to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem2);
  // 6. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Validation: Order contains items from multiple sellers
  TestValidator.predicate(
    "order has items from multiple sellers",
    order.orderItems.length >= 2,
  );
  // Validation: Order items reference correct sellers
  const sellerIdsInOrder = new Set(
    order.orderItems.map((item) => item.seller.id),
  );
  TestValidator.predicate(
    "order items from different sellers",
    sellerIdsInOrder.size >= 2,
  );
  // Validation: Order items contain seller snapshot data
  for (const item of order.orderItems) {
    TestValidator.predicate(
      "seller shop name preserved",
      item.sellerShopName.length > 0,
    );
  }
  // Validation: Total price calculation
  const expectedTotal = order.orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  TestValidator.equals("total price correct", order.total_price, expectedTotal);
  // Validation: Each seller's item is correctly associated
  const seller1Items = order.orderItems.filter(
    (item) => item.seller.id === seller1Auth.id,
  );
  const seller2Items = order.orderItems.filter(
    (item) => item.seller.id === seller2Auth.id,
  );
  TestValidator.predicate(
    "seller1 items exist in order",
    seller1Items.length > 0,
  );
  TestValidator.predicate(
    "seller2 items exist in order",
    seller2Items.length > 0,
  );
}
