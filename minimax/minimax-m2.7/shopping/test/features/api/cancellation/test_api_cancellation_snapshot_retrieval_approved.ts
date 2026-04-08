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
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving an approved cancellation request snapshot.
 *
 * Validates the complete flow of cancellation request approval and snapshot retrieval.
 * This test ensures that when a seller approves a cancellation request, an immutable
 * snapshot is created capturing the state at approval time. The snapshot serves as
 * authoritative evidence for dispute resolution, preserving the reason and status
 * that existed when the seller took action.
 *
 * The test follows this sequence:
 * 1. Admin registers and authenticates for seller approval
 * 2. Customer registers and authenticates for purchasing
 * 3. Seller registers with pending approval status
 * 4. Admin approves seller registration
 * 5. Seller creates a product with variants and inventory
 * 6. Customer adds product to cart and places an order
 * 7. Customer submits cancellation request with reason 'Changed my mind'
 * 8. Seller approves the cancellation - creates snapshot
 * 9. Customer retrieves the snapshot via GET endpoint
 * 10. Validates snapshot data integrity for dispute resolution
 */
export async function test_api_cancellation_snapshot_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Register and authenticate admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup - Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: "qweqweqweqwe",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Seller setup - Register seller (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves seller registration
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    { sellerId: sellerAuth.id },
  );
  // 5. Seller authenticates with approved account
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "qweqweqweqwe",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Seller creates product
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: "Test Product",
          description: "Test product description",
          basePrice: 10000,
          categoryId: "00000000-0000-0000-0000-000000000001",
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  typia.assert(variant);
  // 7. Seller adds inventory to product variant
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.variants.inventory.create(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: 100,
          reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 8. Customer adds product to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Customer creates order with shipping address
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
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
  // Get the first order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 10. Customer submits cancellation request with reason 'Changed my mind'
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.cancel.create(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: "Changed my mind",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  // Cast to access the id property that exists in actual API response
  const cancellationRequestWithId =
    cancellationRequest as IEcommerceMallCancellationRequest & {
      id: string & tags.Format<"uuid">;
    };
  typia.assert(cancellationRequestWithId);
  // 11. Seller approves the cancellation request - creates immutable snapshot
  const approvedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.approve(
      sellerConnection,
      { requestId: cancellationRequestWithId.id },
    );
  typia.assert(approvedRequest);
  // The approved request response may contain snapshots array
  // Get the first snapshot ID from the approved request if available
  const approvedWithSnapshots = approvedRequest as {
    snapshots?: Array<{
      id: string & tags.Format<"uuid">;
    }>;
  };
  const snapshotId =
    approvedWithSnapshots.snapshots &&
    approvedWithSnapshots.snapshots.length > 0
      ? approvedWithSnapshots.snapshots[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 12. Customer retrieves the snapshot using GET endpoint
  const snapshot =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        requestId: cancellationRequestWithId.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 13. Validate snapshot data
  // Validate the snapshot contains expected data for dispute resolution
  TestValidator.equals(
    "cancellationRequestId matches original request",
    snapshot.cancellationRequestId,
    cancellationRequestWithId.id,
  );
  TestValidator.equals(
    "reason preserved from original request",
    snapshot.reason,
    "Changed my mind",
  );
  TestValidator.equals("status is approved", snapshot.status, "approved");
  TestValidator.predicate(
    "createdAt timestamp is valid ISO date-time",
    (snapshot.createdAt as string).match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    ) !== null,
  );
}
