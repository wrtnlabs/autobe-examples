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

export async function test_api_cancellation_request_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Add product variant to cart
  const variantId = product.variants[0].id;
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Complete checkout to create order
  const paymentToken = typia.random<string>();
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: paymentToken,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 7. Get the order item ID
  const orderItemId = order.orderItems[0].id;
  // 8. Customer submits cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  // List cancellation requests to create one
  await api.functional.ecommerceMall.customer.cancellation_requests.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
    },
  );
  // Find the cancellation request we just created
  const cancellationRequestResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequestResponse);
  const cancellationRequest = cancellationRequestResponse.data.find(
    (req) => req.orderItem.id === orderItemId,
  );
  const requestId = cancellationRequest?.id;
  // 9. Seller approves the cancellation request (creates snapshot)
  const approvedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        requestId: requestId!,
      },
    );
  typia.assert(approvedCancellation);
  // Validate the approved cancellation request
  TestValidator.equals(
    "cancellation request status is approved",
    approvedCancellation.status,
    "approved",
  );
  TestValidator.equals(
    "cancellation request reason preserved",
    approvedCancellation.reason,
    cancellationReason,
  );
  // 10. Admin retrieves cancellation request snapshots with pagination
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.index(
      adminConnection,
      {
        requestId: requestId!,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    snapshotsResponse.pagination !== null &&
      snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    snapshotsResponse.data !== null && snapshotsResponse.data !== undefined,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    snapshotsResponse.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    snapshotsResponse.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    snapshotsResponse.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    snapshotsResponse.pagination.pages !== undefined,
    true,
  );
  // Validate snapshot data
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsResponse.data.length >= 1,
  );
  // Validate first snapshot structure
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshot has id",
    firstSnapshot.id !== null && firstSnapshot.id !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has reason",
    firstSnapshot.reason !== null && firstSnapshot.reason !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has status",
    firstSnapshot.status !== null && firstSnapshot.status !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    firstSnapshot.created_at !== null && firstSnapshot.created_at !== undefined,
    true,
  );
  // Validate snapshot content
  TestValidator.equals(
    "snapshot reason matches original request",
    firstSnapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    firstSnapshot.status,
    "approved",
  );
  // Validate cancellation_request context
  TestValidator.predicate(
    "cancellation_request context exists",
    firstSnapshot.cancellation_request !== null &&
      firstSnapshot.cancellation_request !== undefined,
  );
  TestValidator.equals(
    "cancellation_request has customer",
    firstSnapshot.cancellation_request.customer !== null &&
      firstSnapshot.cancellation_request.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "cancellation_request has seller",
    firstSnapshot.cancellation_request.seller !== null &&
      firstSnapshot.cancellation_request.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "cancellation_request has orderItem",
    firstSnapshot.cancellation_request.orderItem !== null &&
      firstSnapshot.cancellation_request.orderItem !== undefined,
    true,
  );
  // Validate ordering (most recent first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const current = snapshotsResponse.data[i];
      const previous = snapshotsResponse.data[i - 1];
      TestValidator.predicate(
        "snapshots ordered by created_at descending",
        new Date(current.created_at) <= new Date(previous.created_at),
      );
    }
  }
}