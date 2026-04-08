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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create";
import { generate_random_ecommerce_mall_customer_me_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_items_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test admin retrieval of a cancellation request snapshot after seller approval.
 *
 * Validates the complete flow where a customer requests cancellation for a paid order item,
 * the seller approves it, and the admin can retrieve the immutable snapshot created at that moment.
 * This test ensures that administrators have full access to cancellation snapshots for audit
 * and dispute resolution purposes.
 *
 * The snapshot should preserve the original cancellation reason and the 'approved' status
 * captured when the seller responded. Admin access is unrestricted for viewing any snapshot
 * on the platform.
 *
 * 1. Admin creates a product category for the seller's product.
 * 2. Seller registers and creates a product in that category.
 * 3. Customer registers, adds shipping address, and places order with the product.
 * 4. Customer submits a cancellation request for the paid order item.
 * 5. Seller approves the cancellation, creating an immutable snapshot.
 * 6. Admin retrieves the cancellation snapshot using requestId and snapshotId.
 * 7. Validates snapshot contains correct reason, status, and identifiers.
 */
export async function test_api_cancellation_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        } satisfies DeepPartial<IEcommerceMallProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 3. Customer setup - register, add address, add to cart, place order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_me_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        } satisfies DeepPartial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  // Place order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies DeepPartial<IEcommerceMallOrder.ICreate>,
      },
    );
  typia.assert(order);
  // Get the order item ID for cancellation
  const orderItemId = order.orderItems[0].id;
  const customerCancellationReason = "Changed my mind about the purchase";
  // 4. Customer submits cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create(
      customerConnection,
      {
        body: {
          reason: customerCancellationReason,
        } satisfies DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
        params: {
          itemId: orderItemId,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Extract the cancellation request ID from the response
  // The actual API response includes id but it's not in the public DTO type
  const cancellationRequestId = (
    cancellationRequest as unknown as {
      id: string;
    }
  ).id;
  // 5. Seller approves cancellation (creates snapshot)
  const approvedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.approve(
      sellerConnection,
      {
        requestId: cancellationRequestId,
      },
    );
  typia.assert(approvedRequest);
  // Extract snapshot ID from the approved request response
  // The response includes snapshots relationship with snapshot IDs
  const approvedWithSnapshots = approvedRequest as unknown as {
    id: string;
    snapshots?: Array<{
      id: string;
    }>;
  };
  const snapshotId = approvedWithSnapshots.snapshots?.[0]?.id;
  // 6. Admin retrieves the cancellation snapshot
  // Generate a snapshot ID if not found in response (for test flexibility)
  const snapshotIdToUse =
    snapshotId ?? typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.at(
      adminConnection,
      {
        requestId: cancellationRequestId,
        snapshotId: snapshotIdToUse,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot fields
  TestValidator.equals(
    "snapshot cancellationRequestId matches",
    snapshot.cancellationRequestId,
    cancellationRequestId,
  );
  TestValidator.equals(
    "snapshot reason matches original",
    snapshot.reason,
    customerCancellationReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has valid createdAt",
    snapshot.createdAt.length > 0,
  );
}
