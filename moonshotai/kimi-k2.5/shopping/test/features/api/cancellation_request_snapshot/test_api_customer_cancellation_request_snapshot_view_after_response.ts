import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test customer viewing cancellation request snapshots after seller response.
 *
 * This test validates that a customer can view the immutable snapshots
 * of their cancellation request after a seller has responded (approved or rejected).
 * The snapshot captures the state transition including before/after status,
 * reason, and reviewer notes.
 */
export async function test_api_customer_cancellation_request_snapshot_view_after_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Admin creates a product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer performs checkout to create a paid order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Customer",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // Get the order item from the created order
  const orderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(order.orderItems[0]);
  // 7. Customer submits a cancellation request
  const cancellationReason = "Changed my mind about the purchase";
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: cancellationReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 8. Seller responds to the cancellation request (approving)
  const sellerResponseNote = "Cancellation approved by seller";
  const respondedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: sellerResponseNote,
        },
      },
    );
  typia.assert(respondedRequest);
  // Verify the response was successful
  TestValidator.equals(
    "status changed to approved",
    respondedRequest.status,
    "approved",
  );
  // 9. Customer queries the snapshots endpoint
  const snapshotRequest: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "created_at:desc",
  };
  const snapshotsPage: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 10. Validate response and snapshot fields
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    snapshotsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    snapshotsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "has at least one page",
    snapshotsPage.pagination.pages >= 1,
  );
  // Verify data array exists and has at least one snapshot
  typia.assertGuard(snapshotsPage.data.length > 0);
  const snapshot = snapshotsPage.data[0];
  typia.assert(snapshot);
  // Verify snapshot fields match expected values from the state transition
  TestValidator.equals(
    "statusBefore is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "statusAfter is approved",
    snapshot.statusAfter,
    "approved",
  );
  TestValidator.equals(
    "reasonBefore matches customer reason",
    snapshot.reasonBefore,
    cancellationReason,
  );
  TestValidator.equals(
    "reviewerNote matches seller response",
    snapshot.reviewerNote,
    sellerResponseNote,
  );
  // Verify createdAt timestamp is present and valid
  TestValidator.predicate(
    "createdAt is present",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  // 11. Test filter parameters (status_before filter)
  const filteredSnapshots =
    await api.functional.ecommerceMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          status_before: "pending",
        },
      },
    );
  typia.assert(filteredSnapshots);
  // Verify filter works - should return the same snapshot since it transitioned from pending
  TestValidator.predicate(
    "filter by status_before returns results",
    filteredSnapshots.pagination.records >= 1,
  );
  // Verify all returned snapshots match the filter
  for (const snap of filteredSnapshots.data) {
    TestValidator.equals(
      "filtered snapshot has correct status_before",
      snap.statusBefore,
      "pending",
    );
  }
  // 12. Test filter by status_after
  const approvedFilteredSnapshots =
    await api.functional.ecommerceMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          status_after: "approved",
        },
      },
    );
  typia.assert(approvedFilteredSnapshots);
  TestValidator.predicate(
    "filter by status_after returns results",
    approvedFilteredSnapshots.pagination.records >= 1,
  );
  for (const snap of approvedFilteredSnapshots.data) {
    TestValidator.equals(
      "filtered snapshot has correct status_after",
      snap.statusAfter,
      "approved",
    );
  }
  // 13. Verify only snapshots for this specific cancellation request are returned
  for (const snap of snapshotsPage.data) {
    // The snapshot belongs to the cancellation request we created (implicit check through API)
    TestValidator.predicate(
      "snapshot has valid id",
      snap.id !== null && snap.id !== undefined,
    );
  }
  // 14. Test edge case: Verify no snapshots returned for non-existent filter
  const nonExistentFilteredSnapshots =
    await api.functional.ecommerceMall.customer.cancellationRequests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          status_before: "rejected", // This shouldn't match since we approved
        },
      },
    );
  typia.assert(nonExistentFilteredSnapshots);
  TestValidator.equals(
    "filter by non-matching status_before returns empty",
    nonExistentFilteredSnapshots.pagination.records,
    0,
  );
}