import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can filter refund requests by status.
 *
 * Setup steps:
 * 1. Create administrator, seller, and customer accounts
 * 2. Create product with variant and add inventory
 * 3. Create first order, ship and deliver, then create pending refund request
 * 4. Create second order, ship and deliver, create refund request and have seller approve it
 *
 * Test execution:
 * - Filter by 'pending' status and verify only pending requests are returned
 * - Filter by 'approved' status and verify only approved requests are returned
 */
export async function test_api_refund_request_filter_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const administratorConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Setup Administrator and create category
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      { body: { name: RandomGenerator.name(1) } },
    );
  typia.assert(category);
  // 2. Setup Seller and create product with variant
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<1000>
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
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: {
            color: RandomGenerator.pick(["red", "blue", "green"]),
          },
        },
      },
    );
  typia.assert(variant);
  // Add inventory
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
        >(),
        reason: "Initial stock",
      },
    },
  );
  // 3. Setup Customer and create address
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "123 Main St",
        city: "City",
        state_province: "State",
        postal_code: "12345",
        country: "Country",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 4. Create first order and refund request (will remain pending)
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variant.id, quantity: 1 },
    },
  );
  const order1 = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order1);
  // Create shipment - the shipment response includes order items
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order1.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment1);
  // Get order item ID from shipment response
  const orderItem1Id = shipment1.orderItems[0].id;
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment1.id },
  );
  const pendingRefundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem1Id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(pendingRefundRequest);
  // 5. Create second order and refund request (will be approved)
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { variant_id: variant.id, quantity: 1 },
    },
  );
  const order2 = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order2);
  // Create second shipment
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order2.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment2);
  // Get order item ID from shipment response
  const orderItem2Id = shipment2.orderItems[0].id;
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment2.id },
  );
  const approvedRefundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem2Id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(approvedRefundRequest);
  // Seller approves the refund request
  await api.functional.shoppingMall.seller.refund_requests.update(
    sellerConnection,
    {
      refundRequestId: approvedRefundRequest.id,
      body: { decision: "approve" },
    },
  );
  // 6. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: { status: "pending" } },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns results",
    pendingResult.data.length > 0,
  );
  TestValidator.predicate(
    "all pending results have pending status",
    pendingResult.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "approved refund request not in pending results",
    pendingResult.data.every((r) => r.id !== approvedRefundRequest.id),
  );
  // 7. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: { status: "approved" } },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns results",
    approvedResult.data.length > 0,
  );
  TestValidator.predicate(
    "all approved results have approved status",
    approvedResult.data.every((r) => r.status === "approved"),
  );
  TestValidator.predicate(
    "pending refund request not in approved results",
    approvedResult.data.every((r) => r.id !== pendingRefundRequest.id),
  );
}
