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
 * Test administrator viewing cancellation request snapshots for dispute resolution.
 *
 * This test validates that administrators can view the immutable audit trail of
 * cancellation requests after seller approval, ensuring proper dispute resolution
 * capabilities and compliance requirements.
 *
 * Test flow:
 * 1. Admin authentication setup
 * 2. Create product category (admin)
 * 3. Create seller and product with variant
 * 4. Add inventory to make variant available
 * 5. Create customer and add item to cart
 * 6. Checkout to create order
 * 7. Create cancellation request for paid order item
 * 8. Seller approves cancellation (creates snapshot)
 * 9. Admin views snapshots and validates audit trail
 */
export async function test_api_admin_cancellation_request_snapshot_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Step 2: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 3: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // Step 4: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Step 5: Create product variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // Step 6: Add inventory to variant
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock setup",
        },
      },
    );
  typia.assert(inventory);
  // Step 7: Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // Step 8: Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 9: Checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem & IEntity;
  typia.assert(orderItem);
  // Step 10: Create cancellation request as customer
  const cancellationReason = "Changed my mind about the purchase";
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  typia.assert(cancellationRequest.status === "pending");
  typia.assert(cancellationRequest.orderItem.id === orderItem.id);
  // Step 11: Seller approves cancellation (creates snapshot)
  const sellerResponseNote =
    "Approved as per customer request - item not yet shipped";
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellationRequests.actions.respond(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          action: "approve",
          reason: sellerResponseNote,
        } satisfies IEcommerceMallCancellationRequest.IRespond,
      },
    );
  typia.assert(approvedRequest);
  typia.assert(approvedRequest.status === "approved");
  // Step 12: Admin views cancellation request snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.cancellationRequests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Step 13: Validate snapshot response structure
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(snapshotsResponse.data),
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length >= 1,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshotsResponse.pagination.pages >= 0,
  );
  // Validate snapshot content
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  // Verify status transition is captured
  TestValidator.equals(
    "status_before should be pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status_after should be approved",
    snapshot.statusAfter,
    "approved",
  );
  // Verify snapshot contains cancellation reason before
  TestValidator.predicate(
    "reason_before exists and is not null",
    snapshot.reasonBefore !== null,
  );
  TestValidator.equals(
    "reason_before matches cancellation reason",
    snapshot.reasonBefore,
    cancellationReason,
  );
  // Verify snapshot contains reviewer note from seller approval
  TestValidator.predicate(
    "reviewer_note exists and is not null",
    snapshot.reviewerNote !== null,
  );
  TestValidator.equals(
    "reviewer_note matches seller response",
    snapshot.reviewerNote,
    sellerResponseNote,
  );
  // Verify created_at timestamp exists and is valid
  TestValidator.predicate(
    "created_at is valid date",
    new Date(snapshot.createdAt).getTime() > 0,
  );
  // Validate chronological ordering (if multiple snapshots, they should be ordered by created_at)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevSnapshot = snapshotsResponse.data[i - 1];
      const currSnapshot = snapshotsResponse.data[i];
      const prevTime = new Date(prevSnapshot.createdAt).getTime();
      const currTime = new Date(currSnapshot.createdAt).getTime();
      TestValidator.predicate(
        `snapshots are ordered chronologically at index ${i}`,
        prevTime <= currTime,
      );
    }
  }
}
