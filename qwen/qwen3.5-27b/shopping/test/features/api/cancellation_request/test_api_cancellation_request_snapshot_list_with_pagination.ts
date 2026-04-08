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
 * Test that authenticated customers can retrieve paginated cancellation request snapshots.
 *
 * Validates the complete cancellation request snapshot listing flow including customer and seller authentication, product creation, order placement, cancellation request creation, seller approval, and snapshot retrieval. Ensures that snapshots correctly capture the status transitions and seller responses with proper pagination.
 *
 * Special attention is given to verifying that snapshots are immutable audit records containing the exact state when sellers responded, including status_before, status_after, seller_response, and timestamps. The test validates that pagination metadata is accurate and snapshots are sorted by created_at descending.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a variant with SKU code, options, and initial stock quantity.
 * 5. Customer adds the variant to their shopping cart with quantity.
 * 6. Customer places an order through checkout with shipping address and payment token.
 * 7. Customer creates first cancellation request for the order item with reason.
 * 8. Seller approves first cancellation request with response reason (creates snapshot).
 * 9. Customer creates second cancellation request for another order item.
 * 10. Seller approves second cancellation request with response reason (creates snapshot).
 * 11. Customer retrieves paginated list of cancellation request snapshots.
 * 12. Validates snapshot data, pagination metadata, and sorting order.
 */
export async function test_api_cancellation_request_snapshot_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with inventory
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
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
    {
      body: {},
    },
  );
  typia.assert(order);
  // 7. Customer creates first cancellation request
  const firstCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "Changed my mind about this purchase",
        },
      },
    );
  typia.assert(firstCancellationRequest);
  // 8. Seller approves first cancellation request (creates snapshot)
  const approvedFirst =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: firstCancellationRequest.id,
        body: {
          status: "approved",
          response_reason: "No problem, cancellation approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedFirst);
  // 9. Create second order and cancellation request
  // Add variant to cart again
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // Place second order
  const order2 = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(order2);
  // Create second cancellation request
  const secondCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.items[0].id,
          reason: "Received duplicate order by mistake",
        },
      },
    );
  typia.assert(secondCancellationRequest);
  // 10. Seller approves second cancellation request (creates snapshot)
  const approvedSecond =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: secondCancellationRequest.id,
        body: {
          status: "approved",
          response_reason: "Understood, cancellation approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedSecond);
  // 11. Customer retrieves paginated list of cancellation request snapshots
  const snapshotsPage =
    await api.functional.shoppingMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 12. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage.pagination.limit, 20);
  TestValidator.predicate(
    "has snapshots",
    snapshotsPage.pagination.records >= 2,
  );
  TestValidator.predicate("has pages", snapshotsPage.pagination.pages >= 1);
  // 13. Validate snapshot count matches expected
  TestValidator.equals(
    "snapshot count matches records",
    snapshotsPage.data.length,
    snapshotsPage.pagination.records,
  );
  // 14. Validate each snapshot has required fields
  await ArrayUtil.asyncForEach(snapshotsPage.data, async (snapshot, index) => {
    typia.assert(snapshot);
    // Validate snapshot has id
    TestValidator.predicate(
      `snapshot ${index} has id`,
      snapshot.id !== undefined && snapshot.id !== null,
    );
    // Validate status_before is 'pending'
    TestValidator.equals(
      `snapshot ${index} status_before is pending`,
      snapshot.status_before,
      "pending",
    );
    // Validate status_after is 'approved'
    TestValidator.equals(
      `snapshot ${index} status_after is approved`,
      snapshot.status_after,
      "approved",
    );
    // Validate seller_response exists
    TestValidator.predicate(
      `snapshot ${index} has seller_response`,
      snapshot.seller_response !== null,
    );
    // Validate created_at exists
    TestValidator.predicate(
      `snapshot ${index} has created_at`,
      snapshot.created_at !== undefined && snapshot.created_at !== null,
    );
    // Validate seller information exists
    TestValidator.predicate(
      `snapshot ${index} has seller`,
      snapshot.seller !== undefined && snapshot.seller !== null,
    );
    // Validate cancellation request information exists
    TestValidator.predicate(
      `snapshot ${index} has cancellationRequest`,
      snapshot.cancellationRequest !== undefined &&
        snapshot.cancellationRequest !== null,
    );
  });
  // 15. Validate snapshots are sorted by created_at descending (newest first)
  if (snapshotsPage.data.length >= 2) {
    const firstSnapshot = snapshotsPage.data[0];
    const secondSnapshot = snapshotsPage.data[1];
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      new Date(firstSnapshot.created_at).getTime() >=
        new Date(secondSnapshot.created_at).getTime(),
    );
  }
  // 16. Validate snapshot data matches actual seller responses
  const firstSnapshot = snapshotsPage.data.find(
    (s) => s.cancellationRequest.id === firstCancellationRequest.id,
  );
  if (firstSnapshot) {
    TestValidator.equals(
      "first snapshot seller_response matches",
      firstSnapshot.seller_response,
      "No problem, cancellation approved",
    );
  }
  const secondSnapshot = snapshotsPage.data.find(
    (s) => s.cancellationRequest.id === secondCancellationRequest.id,
  );
  if (secondSnapshot) {
    TestValidator.equals(
      "second snapshot seller_response matches",
      secondSnapshot.seller_response,
      "Understood, cancellation approved",
    );
  }
}
