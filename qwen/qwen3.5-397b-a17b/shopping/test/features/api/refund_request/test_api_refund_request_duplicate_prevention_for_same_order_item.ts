import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test duplicate refund request prevention for the same order item.
 *
 * Validates the business rule that each order item can have at most one refund request. The test creates a complete order workflow from product creation through delivery, then attempts to create two refund requests for the same order item. The first request should succeed while the second must be rejected with a 409 Conflict error due to the unique constraint on shopping_mall_order_item_id.
 *
 * This scenario tests the data integrity mechanism preventing refund fraud by ensuring customers cannot submit multiple refund requests for a single purchased item. The unique constraint at the database level enforces this business rule consistently across all refund request operations.
 *
 * 1. Administrator creates account and logs in for category management.
 * 2. Seller creates account and logs in for product creation and order fulfillment.
 * 3. Member customer creates account and logs in for placing order and requesting refund.
 * 4. Administrator creates product category.
 * 5. Seller creates product listing in the catalog.
 * 6. Seller creates product variant with SKU and options for purchase.
 * 7. Member creates shipping address for order delivery.
 * 8. Member adds product variant to shopping cart.
 * 9. Member places order converting cart items to order items with 'paid' status.
 * 10. Seller creates shipment with tracking info transitioning order items to 'shipped' status.
 * 11. Member creates first refund request for the order item - should succeed with 'pending' status.
 * 12. Member attempts to create second refund request for the same order_item_id - should fail with 409 Conflict.
 * 13. Validate that the error response indicates duplicate refund request.
 */
export async function test_api_refund_request_duplicate_prevention_for_same_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Member customer setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. Administrator creates category
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant
  const variant = await api.functional.shoppingMall.seller.variants.create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProductVariant.ICreate,
    },
  );
  typia.assert(variant);
  // 7. Member creates shipping address
  const address = await api.functional.shoppingMall.member.addresses.create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 8. Member adds product variant to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 9. Member places order
  const order = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 10. Seller creates shipment to transition order items to 'shipped' status
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 11. Member creates first refund request - should succeed
  const firstRefundRequest =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(firstRefundRequest);
  // Validate first refund request
  TestValidator.equals(
    "first refund request order item",
    firstRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "first refund request status",
    firstRefundRequest.status,
    "pending",
  );
  // 12. Member attempts second refund request for same order item - should fail with 409
  await TestValidator.error("duplicate refund request rejected", async () => {
    await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  });
}
