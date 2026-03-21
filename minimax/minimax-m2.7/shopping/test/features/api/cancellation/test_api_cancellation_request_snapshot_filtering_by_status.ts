import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_snapshot_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Add product to cart
  const variantId = product.variants[0].id;
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantId,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  // 6. Complete checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(8),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 7. Customer submits cancellation request
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequest);
  const requestId = cancellationRequest.data[0].id;
  // 8. Seller rejects the cancellation (creates 'rejected' snapshot)
  const rejectionReason = "Product already prepared for shipping";
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        requestId: requestId,
        body: {
          reason: rejectionReason,
        } satisfies IEcommerceMallCancellationRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 9. Get all snapshots to verify snapshots exist
  const allSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: requestId,
        body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate that we have at least one snapshot (the rejection)
  TestValidator.predicate(
    "has at least one snapshot",
    allSnapshots.data.length >= 1,
  );
  // 10. Filter by status='rejected'
  const rejectedSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: requestId,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 11. Validate filtered results - all should be 'rejected'
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status is rejected",
      snapshot.status,
      "rejected" as const,
    );
  }
  // 12. Filter by status='approved'
  const approvedSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: requestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 13. Validate - approved snapshots should be empty (we only rejected)
  TestValidator.equals(
    "no approved snapshots when only rejected",
    approvedSnapshots.data.length,
    0,
  );
  // 14. Verify the rejected snapshot contains correct data
  const firstRejectedSnapshot = rejectedSnapshots.data[0];
  if (firstRejectedSnapshot) {
    TestValidator.equals(
      "rejected snapshot preserves cancellation request context",
      firstRejectedSnapshot.cancellation_request.id,
      requestId,
    );
    TestValidator.equals(
      "rejected snapshot preserves reason",
      firstRejectedSnapshot.reason,
      rejectionReason,
    );
    TestValidator.equals(
      "rejected snapshot has correct status",
      firstRejectedSnapshot.status,
      "rejected" as const,
    );
  }
  // 15. Validate pagination works with filtered results
  TestValidator.predicate(
    "has pagination metadata",
    !!approvedSnapshots.pagination,
  );
  TestValidator.equals(
    "pagination has valid current page",
    approvedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has valid limit",
    approvedSnapshots.pagination.limit > 0,
    true,
  );
}
