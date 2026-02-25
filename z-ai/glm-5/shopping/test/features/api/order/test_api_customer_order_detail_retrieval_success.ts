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
 * Test successful order detail retrieval by an authenticated customer.
 *
 * This test validates the primary success path for retrieving order details,
 * including:
 * 1. Order identification (id, order_number, total_price, status, timestamps)
 * 2. Shipping address snapshot captured at order placement time
 * 3. Order items with individual statuses and complete snapshot data
 * 4. Variant options as key-value pairs
 * 5. Seller information preserved in snapshot
 *
 * Authorization is verified: only the customer who placed the order
 * can access this endpoint.
 */
export async function test_api_customer_order_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // 1. Setup Admin (for seller approval)
  // ===========================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ===========================================
  // 2. Setup Seller and Get Approved
  // ===========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // ===========================================
  // 3. Seller Creates Product with Variant
  // ===========================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${Date.now()}-${RandomGenerator.alphaNumeric(6)}`,
          price: null,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Black",
                "White",
              ] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // ===========================================
  // 4. Customer Setup and Order Flow
  // ===========================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Create order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // ===========================================
  // 5. Test: Retrieve Order Details
  // ===========================================
  const retrievedOrder =
    await api.functional.shoppingMall.customer.customers.me.orders.at(
      customerConnection,
      { orderId: order.id },
    );
  typia.assert(retrievedOrder);
  // ===========================================
  // 6. Validate Order Identification
  // ===========================================
  TestValidator.equals("order ID matches", retrievedOrder.id, order.id);
  TestValidator.predicate(
    "order number exists",
    retrievedOrder.order_number.length > 0,
  );
  TestValidator.predicate(
    "total price is positive",
    retrievedOrder.total_price > 0,
  );
  TestValidator.equals("initial status is paid", retrievedOrder.status, "paid");
  // ===========================================
  // 7. Validate Shipping Address Snapshot
  // ===========================================
  TestValidator.predicate(
    "address has recipient name",
    retrievedOrder.address.recipientName.length > 0,
  );
  TestValidator.predicate(
    "address has phone",
    retrievedOrder.address.phone.length > 0,
  );
  TestValidator.predicate(
    "address has street",
    retrievedOrder.address.street.length > 0,
  );
  TestValidator.predicate(
    "address has city",
    retrievedOrder.address.city.length > 0,
  );
  TestValidator.predicate(
    "address has state",
    retrievedOrder.address.state.length > 0,
  );
  TestValidator.predicate(
    "address has postal code",
    retrievedOrder.address.postalCode.length > 0,
  );
  TestValidator.predicate(
    "address has country",
    retrievedOrder.address.country.length > 0,
  );
  // ===========================================
  // 8. Validate Order Items
  // ===========================================
  TestValidator.predicate(
    "order has items",
    retrievedOrder.orderItems.length > 0,
  );
  const orderItem = retrievedOrder.orderItems[0];
  TestValidator.equals("item initial status is paid", orderItem.status, "paid");
  TestValidator.predicate(
    "quantity matches cart",
    orderItem.quantity === cartItem.quantity,
  );
  // ===========================================
  // 9. Validate Snapshot Data
  // ===========================================
  TestValidator.predicate(
    "product name captured",
    orderItem.productName.length > 0,
  );
  TestValidator.predicate(
    "product description captured",
    orderItem.productDescription.length > 0,
  );
  TestValidator.predicate(
    "variant SKU captured",
    orderItem.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name captured",
    orderItem.sellerShopName.length > 0,
  );
  // ===========================================
  // 10. Validate Variant Options
  // ===========================================
  TestValidator.predicate(
    "variant options exist",
    orderItem.variantOptions.length > 0,
  );
  const colorOption = orderItem.variantOptions.find(
    (opt) => opt.key === "color",
  );
  TestValidator.predicate("color option exists", colorOption !== undefined);
  const sizeOption = orderItem.variantOptions.find((opt) => opt.key === "size");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  // ===========================================
  // 11. Validate Authorization (cannot access other's order)
  // ===========================================
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {});
  await TestValidator.error("other customer cannot access order", async () => {
    await api.functional.shoppingMall.customer.customers.me.orders.at(
      otherCustomerConnection,
      { orderId: order.id },
    );
  });
}
