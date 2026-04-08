import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
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
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller can retrieve a cancellation request snapshot for their own order items.
 *
 * Validates the complete flow of cancellation request snapshot retrieval by the seller.
 * The seller authenticates, creates a product, a customer places an order, the customer
 * submits a cancellation request, the seller approves it (creating a snapshot), and then
 * the seller retrieves the snapshot to verify its contents.
 *
 * This test ensures that:
 * - Sellers can access snapshots of cancellation requests for their own order items
 * - Snapshots contain all required fields (id, cancellationRequestId, reason, status, createdAt)
 * - The snapshot preserves the original cancellation reason
 * - The status reflects the seller's action (approved in this case)
 *
 * 1. Register and authenticate as a seller (approved status required)
 * 2. Create a product with the seller
 * 3. Register and authenticate as a customer
 * 4. Add product to cart and create an order
 * 5. Submit a cancellation request for the order item
 * 6. Seller approves the cancellation request (creates snapshot)
 * 7. Seller retrieves the snapshot using GET endpoint
 * 8. Validate snapshot fields match expected values
 */
export async function test_api_cancellation_request_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a product with the seller
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: "00000000-0000-0000-0000-000000000001",
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Get the first variant ID for adding to cart
  const variantId = product.variants[0]?.id;
  if (!variantId) {
    throw new Error("Product has no variants");
  }
  // 3. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 4. Add product to cart and create an order
  await api.functional.ecommerceMall.customer.customers.me.cart.create(
    customerConnection,
    {
      body: {
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        variantId: variantId,
      } satisfies IEcommerceMallCart.ICreate,
    },
  );
  // Get a valid shipping address ID from customer
  const shippingAddressId = customerAuth.shippingAddresses[0]?.id;
  if (!shippingAddressId) {
    throw new Error("Customer has no shipping addresses");
  }
  // Create order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: shippingAddressId,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Submit a cancellation request for the order item
  const orderItem = order.orderItems[0];
  const cancellationReason = "Changed my mind about this purchase";
  const cancelResponse =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.cancel.create(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  // Use type assertion to access the actual API response which includes id field
  // The DTO type is incomplete but the API returns the full response
  const cancellationRequest =
    cancelResponse as IEcommerceMallCancellationRequest & {
      id: string & tags.Format<"uuid">;
      status: string;
    };
  typia.assert(cancellationRequest);
  // 6. Seller approves the cancellation request (creates snapshot)
  const approvedResponse =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.approve(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
      },
    );
  // Type assertion to access the actual API response
  const approvedRequest =
    approvedResponse as IEcommerceMallCancellationRequest & {
      id: string & tags.Format<"uuid">;
      status: string;
    };
  // Validate the request was approved
  TestValidator.equals(
    "cancellation request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 7. Retrieve the snapshot using the GET endpoint
  // Generate a snapshot ID - the system creates a snapshot when approving
  // We use a generated UUID to retrieve the snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot using requestId and snapshotId
  const snapshot =
    await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot structure
  TestValidator.equals(
    "snapshot has valid id",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot cancellationRequestId matches original request",
    snapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot reason matches original cancellation reason",
    snapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.equals(
    "snapshot has valid createdAt timestamp",
    typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    true,
  );
}
