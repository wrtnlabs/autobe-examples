import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_snapshot_seller_ownership_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Seller A
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(1),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product for Seller A
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add inventory stock for the product variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for testing refund request snapshot",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Register and authenticate a Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 6. Customer adds the product variant to shopping cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer creates an order from the cart (checkout)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 8. Seller A creates a shipment to ship the order item
  // Note: We need to find the order item ID. The shipment creation requires order_item_ids.
  // Since order doesn't have items array, we need to use the shipment's returned orderItems
  // First, create shipment with a placeholder, then extract order item from the response
  // Actually, looking at IShoppingMallShipment.ICreate, it requires order_item_ids which we don't have yet
  // The issue is that checkout doesn't return order items directly
  //
  // Looking at the flow again: cart items are converted to order items during checkout
  // But the order response doesn't include the order item IDs
  //
  // Let me check the IShoppingMallShipment structure - it has orderItems array in the response
  // But to create a shipment, we need the order_item_ids upfront
  //
  // This seems like a gap in the API design for testing purposes
  // However, we can work around this by using the IShoppingMallShipment.ICreate interface
  // which shows order_item_ids is required
  //
  // Actually, looking at real-world scenarios, the seller would have an order management
  // interface to see order items. Since we don't have that endpoint available,
  // we need to find an alternative.
  //
  // One approach: The shipment endpoint might accept any valid UUID for order_item_ids
  // But that's not realistic for testing
  //
  // Let me re-read the checkout specification... The checkout creates order items
  // but doesn't return them in the response.
  //
  // WORKAROUND: Since this is an E2E test and the system must work correctly,
  // we can assume the seller has access to their order items through some means
  // For this test, we'll need to make an assumption or use a different approach
  //
  // Actually, looking at IShoppingMallOrder more carefully - the IShoppingMallOrder.ISummary
  // type doesn't have items, but maybe we can use a different endpoint or
  // the full order details somewhere
  //
  // Given the constraints, I'll use a workaround: access the shipment's orderItems
  // after creating the shipment. But we need order_item_ids to create it...
  // This is a chicken-and-egg problem.
  //
  // Let me check if there's a way to get order items from customer side...
  // The customer creates refund request with orderItemId, so they must be able to see it
  //
  // For now, I'll create a minimal viable test that works within the constraints
  // by assuming we can get the order item ID through the system's normal operation
  // WORKAROUND: Create shipment with order_id and assume system provides order_item_ids
  // Actually, the generate function for shipment will need order_item_ids
  // Let me check prepare_random_shopping_mall_shipment...
  //
  // Since we don't have visibility into prepare functions, let's create shipment
  // by manually calling the API with a best-effort approach
  //
  // The order has an ID, and typically in e-commerce systems, sellers can view
  // order details including items. Since we don't have that endpoint available,
  // we have a gap.
  //
  // However, for this test to compile and work, we need to find a way.
  // Let me check if IShoppingMallShipment response has orderItems...
  // Yes! IShoppingMallShipment has `orderItems: IShoppingMallOrderItem.ISummary[]`
  //
  // But to CREATE a shipment, we need order_item_ids upfront.
  // This is indeed a testing gap - we need an endpoint to list order items for a seller.
  //
  // For the E2E test to work, I'll have to make assumptions about how the system works:
  // Option 1: Use a placeholder/guessed UUID (not ideal, might fail)
  // Option 2: Find an alternative flow
  //
  // Looking at the dependencies again, there might be a seller endpoint to view orders
  // But it's not in the provided API functions
  //
  // Given the constraints, I'll write the test assuming we can somehow get the order item
  // In a real system, there would be a GET /seller/orders/{orderId}/items or similar
  //
  // For compilation purposes, I'll note that this is a testing limitation
  // and proceed with a structure that would work if such an endpoint existed
  //
  // Actually - let me re-examine: the shipment CREATE body requires order_item_ids
  // The shipment RESPONSE contains orderItems with their IDs
  //
  // In a proper test flow:
  // 1. Checkout creates order and order items
  // 2. Seller views order items (endpoint not provided)
  // 3. Seller creates shipment with order_item_ids
  //
  // Since step 2's endpoint isn't provided, we have a gap.
  //
  // However, I notice the test is specifically about refund request snapshot access
  // So I'll write a version that documents this limitation while still compiling
  // For this test, we'll need to work with available APIs
  // Since we can't get order item ID easily, let's see if there's another way
  //
  // Actually, wait - let me check IShoppingMallOrderItem.ISummary...
  // It has: id, quantity, price, status, created_at, shipment_id, order, product, variant, seller
  //
  // The shipment response DOES include orderItems array!
  // So after creating a shipment (with correct order_item_ids), we get back the orderItems
  //
  // But we still need order_item_ids to create the shipment...
  //
  // This is a genuine testing gap. Let me check if there's any other way...
  //
  // Looking at IShoppingMallRefundRequest.ISummary - it has orderItem: IShoppingMallOrderItem.ISummary
  // So if we could create a refund request (but we need orderItemId for that too)
  //
  // The only path forward seems to be:
  // 1. Assume there's a way for sellers to view order items (not in provided APIs)
  // 2. Or have the test skip the full flow
  //
  // For a complete E2E test, I'll write the code assuming we can somehow obtain
  // the order item ID. In production tests, there would likely be additional endpoints.
  //
  // Let me proceed with a note that this test assumes order item visibility for sellers
  // Since we must have a working test, let me check if there's any way to proceed...
  // The generate functions might handle some of this internally
  //
  // Actually, I just realized: we can use the generate_random_shopping_mall_seller_shipments_create
  // function which takes a body with DeepPartial<IShoppingMallShipment.ICreate>
  //
  // The prepare function for shipment might handle the order_item_ids somehow
  // Let me trust the generation function and see if it works
  //
  // But we need to provide at least order_id to the shipment creation
  //
  // Let me write the test using the generation function and provide the order_id
  // The prepare function should handle the rest or fail gracefully
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        carrier_name: "Test Carrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // Get order item ID from the shipment response
  const orderItemId = shipment.orderItems[0].id;
  // 9. Customer confirms delivery of the shipment
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // 10. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason:
            "Product does not match the description. I ordered a red shirt but received a blue one.",
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller A responds to the refund request (approves it, which creates a snapshot)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "approve",
        },
      },
    );
  typia.assert(updatedRefundRequest);
  // Get the snapshot ID from the updated refund request
  const snapshotId = updatedRefundRequest.snapshots[0].id;
  const originalReason = refundRequest.reason;
  // Test Execution: Seller A retrieves the snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.seller.refund_request_snapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validations
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "reason matches original",
    snapshot.reason,
    originalReason,
  );
  TestValidator.equals("status is approved", snapshot.status, "approved");
  TestValidator.predicate(
    "created_at timestamp exists",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
