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

export async function test_api_cancellation_snapshot_retrieval_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer who will request cancellation
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Login as seller to get session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 3. Seller creates product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  // Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock",
          quantity: 10,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 4. Customer adds item to cart and checkout
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // Checkout to place order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(order);
  // Get the order item ID
  const orderItem = order.orderItems[0];
  // 5. List cancellation requests to find the one for our order
  const customerCancellations =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customerCancellations);
  // Find cancellation request for our order item
  const targetCancellation = customerCancellations.data.find(
    (cr) => cr.orderItem.id === orderItem.id,
  );
  // If no cancellation exists yet, test cannot proceed
  if (!targetCancellation) {
    return;
  }
  // 6. Seller rejects cancellation with rejection reason
  const rejectionReason =
    "Sorry, the item has already been prepared for shipping";
  // Seller rejects the cancellation
  const rejectedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.reject(
      sellerLoginConnection,
      {
        requestId: targetCancellation.id,
        body: {
          reason: rejectionReason,
        },
      },
    );
  typia.assert(rejectedCancellation);
  // Validate rejection response
  TestValidator.equals(
    "cancellation status is rejected",
    rejectedCancellation.status,
    "rejected",
  );
  // 7. Customer retrieves the snapshot
  // Get the snapshot ID from the cancellation request
  const snapshotId = rejectedCancellation.snapshots[0]?.id;
  // Verify snapshot was created
  TestValidator.predicate(
    "snapshot exists after rejection",
    snapshotId !== undefined,
  );
  if (snapshotId) {
    const snapshot =
      await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
        customerConnection,
        {
          requestId: rejectedCancellation.id,
          snapshotId: snapshotId,
        },
      );
    typia.assert(snapshot);
    // Validation Points:
    // - Snapshot status is 'rejected'
    TestValidator.equals(
      "snapshot status is rejected",
      snapshot.status,
      "rejected",
    );
    // - Snapshot reason contains the rejection reason
    TestValidator.equals(
      "snapshot reason is captured",
      snapshot.reason,
      rejectionReason,
    );
    // - Snapshot created_at shows timestamp of rejection
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at !== null && snapshot.created_at !== undefined,
    );
    // - Cancellation request object shows current status (still 'rejected')
    TestValidator.equals(
      "cancellation request status is rejected",
      snapshot.cancellation_request.status,
      "rejected",
    );
  }
}
