import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test administrator viewing cancellation request snapshots with status transition filtering.
 *
 * Scenario Flow:
 * 1. Admin creates category (for product creation)
 * 2. Seller registers and creates product with variant
 * 3. Seller adds inventory to variant
 * 4. Customer registers, adds item to cart, and checks out (creating paid order)
 * 5. Customer creates cancellation request for the paid order item
 * 6. Seller responds to cancellation request (approving it), creating a snapshot with status transition
 * 7. Admin queries snapshots with filters: status_before='pending', status_after='approved'
 * 8. Validates filtering returns matching snapshots
 * 9. Tests invalid cancellation request ID returns 404
 * 10. Tests pagination controls (page, limit parameters)
 */
export async function test_api_admin_cancellation_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // ========== Step 1: Create Admin and Category ==========
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // ========== Step 2: Create Seller ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(sellerAuthorized);
  // ========== Step 3: Create Product with Variant ==========
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { stock: 100 },
      },
    );
  typia.assert(variant);
  // ========== Step 4: Add Inventory ==========
  const inventory: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // ========== Step 5: Create Customer ==========
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // ========== Step 6: Add to Cart ==========
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  // ========== Step 7: Checkout ==========
  const order: IEcommerceMallOrder =
    await api.functional.ecommerceMall.customer.checkout.create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          recipientPhone: "01012345678",
          streetAddress: "123 Test Street",
          city: "Seoul",
          state: null,
          postalCode: "12345",
          country: "South Korea",
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get the order item ID (should be in paid status)
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem.ISummary;
  typia.assert(orderItem);
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ========== Step 8: Create Cancellation Request ==========
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellationRequests.create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind about this purchase",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // ========== Step 9: Seller Responds (Approve) - Creates Snapshot ==========
  const respondedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: "Approved as per customer request",
        } satisfies IEcommerceMallCancellationRequest.IRespond,
      },
    );
  typia.assert(respondedRequest);
  TestValidator.equals(
    "cancellation request status is approved after response",
    respondedRequest.status,
    "approved",
  );
  // ========== Step 10: Admin Queries Snapshots with Filters ==========
  // Test 1: Query with status_before='pending', status_after='approved' filter
  const filteredSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.cancellationRequests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status_before: "pending",
          status_after: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Validate filtering returns matching snapshots
  TestValidator.predicate(
    "filtered snapshots should have data",
    filteredSnapshots.data.length > 0,
  );
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.equals(
      "snapshot status_before matches filter",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "snapshot status_after matches filter",
      snapshot.statusAfter,
      "approved",
    );
  }
  // Test 2: Verify pagination controls with page and limit
  const paginatedSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.cancellationRequests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
          status_before: "pending",
          status_after: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    paginatedSnapshots.pagination.records >= 0,
  );
  // Test 3: Invalid cancellation request ID returns 404
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid cancellation request ID should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.cancellationRequests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId: invalidId,
          body: {
            status_before: "pending",
            status_after: "approved",
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
  // Test 4: Filter with non-matching criteria returns empty or filtered results
  const nonMatchingSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.cancellationRequests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status_before: "rejected",
          status_after: "pending",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(nonMatchingSnapshots);
  // Since our snapshot has pending->approved, querying for rejected->pending should return empty
  TestValidator.equals(
    "non-matching filter should return no results",
    nonMatchingSnapshots.data.length,
    0,
  );
}
