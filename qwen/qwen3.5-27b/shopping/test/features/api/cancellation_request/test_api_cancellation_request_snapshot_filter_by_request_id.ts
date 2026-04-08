import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that customers can filter cancellation request snapshots by specific cancellation request ID to view complete audit trail.
 *
 * Validates the complete cancellation request snapshot filtering workflow including customer and seller authentication, product creation, order placement, cancellation request creation, and seller response. Ensures that the snapshot filtering correctly returns only snapshots for the specified cancellation request ID with complete audit trail information.
 *
 * Special attention is given to verifying that the snapshot contains accurate status transition data (status_before and status_after), seller response text, and all related entity information for dispute resolution purposes.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code, options, and initial stock.
 * 5. Customer adds the variant to their shopping cart with quantity.
 * 6. Customer places an order through checkout with shipping address and payment.
 * 7. Customer creates a cancellation request for the order item with a reason.
 * 8. Seller rejects the cancellation request with a response reason (creates snapshot).
 * 9. Customer filters snapshots by cancellation request ID.
 * 10. Validates that only the snapshot for this cancellation request is returned.
 * 11. Validates snapshot contains correct status transition (pending → rejected).
 * 12. Validates seller response text is preserved in the snapshot.
 * 13. Validates all related entities (seller, cancellation request) are properly joined.
 */
export async function test_api_cancellation_request_snapshot_filter_by_request_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: { initialStockQuantity: 10 },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    { body: {} },
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.items[0];
  if (orderItem === undefined)
    throw new Error("Order should contain at least one item");
  // 7. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason:
            "I accidentally ordered the wrong item and would like to cancel this order.",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Seller rejects the cancellation request (creates snapshot)
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          response_reason:
            "We have already prepared your order for shipment and cannot cancel it at this time.",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 9. Customer filters snapshots by cancellation request ID
  const snapshotsResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        body: {
          cancellationRequestId: cancellationRequest.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 10. Validate that only the snapshot for this cancellation request is returned
  TestValidator.equals(
    "snapshot count matches",
    snapshotsResponse.data.length,
    1,
  );
  // 11. Validate pagination metadata
  TestValidator.equals(
    "pagination records",
    snapshotsResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination current",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    snapshotsResponse.pagination.pages,
    1,
  );
  // Get the snapshot
  const snapshot = snapshotsResponse.data[0];
  if (snapshot === undefined)
    throw new Error("Snapshot array should contain at least one element");
  // 12. Validate snapshot contains correct status transition (pending → rejected)
  TestValidator.equals(
    "status_before is pending",
    snapshot.status_before,
    "pending",
  );
  TestValidator.equals(
    "status_after is rejected",
    snapshot.status_after,
    "rejected",
  );
  // 13. Validate seller response text is preserved
  TestValidator.predicate(
    "seller response is not null",
    snapshot.seller_response !== null,
  );
  TestValidator.equals(
    "seller response matches",
    snapshot.seller_response,
    "We have already prepared your order for shipment and cannot cancel it at this time.",
  );
  // 14. Validate snapshot timestamp is valid
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at !== undefined && snapshot.created_at.length > 0,
  );
  // 15. Validate seller information is included
  TestValidator.equals("seller ID matches", snapshot.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email matches",
    snapshot.seller.email,
    sellerAuth.email,
  );
  // 16. Validate cancellation request details are included
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request status matches",
    snapshot.cancellationRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "cancellation request reason matches",
    snapshot.cancellationRequest.reason,
    "I accidentally ordered the wrong item and would like to cancel this order.",
  );
  TestValidator.equals(
    "cancellation request response_reason matches",
    snapshot.cancellationRequest.response_reason,
    "We have already prepared your order for shipment and cannot cancel it at this time.",
  );
}
