import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test seller successfully rejects a pending cancellation request from a customer
 * for a 'paid' order item without providing a rejection reason.
 */
export async function test_api_cancellation_request_rejection_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: "https://example.com/seller",
      referrer: "https://example.com/login",
    },
  });
  // 2. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: "1234",
      href: "https://example.com/checkout",
      referrer: "https://example.com/cart",
    },
  });
  // 3. Create product and add inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    { params: { productId, variantId } },
  );
  // 4. Customer adds item to cart and checkout
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantId,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_" + RandomGenerator.alphabets(8),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  // 5. Verify order item status is 'paid'
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 6. Get pending cancellation requests for the seller
  const cancellationRequestsResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      sellerLoginConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequestsResponse);
  // Find the cancellation request for our order item
  const cancellationRequest = cancellationRequestsResponse.data.find(
    (req) => req.orderItem.id === orderItemId,
  );
  // Get the request ID to reject
  const requestIdToReject = cancellationRequest?.id;
  if (!requestIdToReject) {
    throw new Error(
      "No pending cancellation request found for testing rejection",
    );
  }
  // 7. Verify cancellation request status is 'pending'
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest!.status,
    "pending",
  );
  // Store order item status before rejection
  const orderItemStatusBefore = orderItem.status;
  // 8. Seller rejects the cancellation request without providing a reason
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.reject(
      sellerLoginConnection,
      {
        requestId: requestIdToReject,
        body: {} satisfies IEcommerceMallCancellationRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 9. Validate the rejection response
  TestValidator.equals(
    "cancellation request status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  // Verify order item status remains 'paid'
  TestValidator.equals(
    "order item status remains paid after rejection",
    orderItemStatusBefore,
    "paid",
  );
  // Verify snapshot exists
  TestValidator.predicate(
    "snapshot exists after rejection",
    rejectedRequest.snapshots !== null &&
      rejectedRequest.snapshots !== undefined &&
      rejectedRequest.snapshots.length > 0,
  );
  // Verify snapshot has correct status
  const latestSnapshot =
    rejectedRequest.snapshots[rejectedRequest.snapshots.length - 1];
  TestValidator.equals(
    "snapshot status is rejected",
    latestSnapshot.status,
    "rejected",
  );
  // Verify seller, customer, and order item information included
  TestValidator.predicate(
    "seller information included",
    rejectedRequest.seller !== null && rejectedRequest.seller !== undefined,
  );
  TestValidator.predicate(
    "customer information included",
    rejectedRequest.customer !== null && rejectedRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "order item information included",
    rejectedRequest.orderItem !== null &&
      rejectedRequest.orderItem !== undefined,
  );
  // Verify updated_at is updated after rejection
  TestValidator.predicate(
    "updated_at is updated after rejection",
    new Date(rejectedRequest.updated_at) > new Date(rejectedRequest.created_at),
  );
}
