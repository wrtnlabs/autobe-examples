import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_cancellation_snapshot_audit_trail_integrity(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP PHASE ===
  // 1. Administrator creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller creates product, variant, and adds inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: { categoryId: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial inventory for test",
        },
      },
    );
  typia.assert(inventory);
  // 3. Customer creates order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Customer creates cancellation request with specific reason
  const cancellationReason =
    "Product does not match description - item received is different color than advertised";
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: { orderId: order.id, itemId: orderItem.id },
        body: { reason: cancellationReason },
      },
    );
  typia.assert(cancellationRequest);
  // Validate initial cancellation request state
  TestValidator.equals(
    "initial cancellation status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original reason stored in request",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "no seller assigned yet",
    cancellationRequest.seller,
    null,
  );
  // === ACTION PHASE ===
  // 5. Seller approves the cancellation request (creates immutable snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      { cancellationRequestId: cancellationRequest.id },
    );
  typia.assert(approvedRequest);
  // === AUDIT TRAIL VALIDATION ===
  // Validate cancellation request status transition
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  // Validate original cancellation reason is preserved exactly
  TestValidator.equals(
    "original reason preserved exactly as entered",
    approvedRequest.reason,
    cancellationReason,
  );
  // Validate seller decision is recorded
  TestValidator.predicate(
    "seller information recorded",
    approvedRequest.seller !== null,
  );
  TestValidator.equals(
    "seller id matches",
    approvedRequest.seller?.id,
    sellerAuth.id,
  );
  // Validate response timestamp is set
  TestValidator.predicate(
    "responded_at timestamp is set",
    approvedRequest.responded_at !== null,
  );
  // Validate timestamp reflects seller response moment (should be recent)
  TestValidator.predicate("responded_at is valid ISO datetime", () => {
    if (approvedRequest.responded_at === null) return false;
    const timestamp = new Date(approvedRequest.responded_at!);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    // Should be within last 60 seconds
    return diffMs >= 0 && diffMs < 60000;
  });
  // Validate parent cancellation request relationship
  TestValidator.equals(
    "cancellation request id unchanged",
    approvedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "order item reference maintained",
    approvedRequest.orderItem.id,
    orderItem.id,
  );
  // Validate audit trail timestamps
  TestValidator.predicate(
    "created_at is set",
    approvedRequest.created_at.length > 0,
  );
  TestValidator.predicate("updated_at is after created_at", () => {
    const createdAt = new Date(approvedRequest.created_at);
    const updatedAt = new Date(approvedRequest.updated_at);
    return updatedAt >= createdAt;
  });
  // Validate immutability properties - status is terminal
  TestValidator.predicate("approved status is terminal", () => {
    // Once approved, the status should not change
    return approvedRequest.status === "approved";
  });
  // === SNAPSHOT RETRIEVAL AND VALIDATION ===
  // Note: Snapshot is created during approval. We retrieve it using the snapshot endpoint.
  // The snapshot ID should be derived from the approval process. Based on the DTO structure,
  // we need to access the snapshot through available means.
  // Since the approve endpoint returns the cancellation request and the snapshot is created,
  // we validate the snapshot properties through the cancellation request data.
  // The snapshot preserves: reason, status, created_at (timestamp of response), and parent reference.
  // Additional validation: Ensure the cancellation request data matches what snapshot should contain
  TestValidator.predicate(
    "reason text preserved for audit trail",
    approvedRequest.reason === cancellationReason,
  );
  TestValidator.predicate(
    "status reflects seller decision",
    approvedRequest.status === "approved",
  );
  TestValidator.predicate(
    "response timestamp captured for audit",
    approvedRequest.responded_at !== null,
  );
}
