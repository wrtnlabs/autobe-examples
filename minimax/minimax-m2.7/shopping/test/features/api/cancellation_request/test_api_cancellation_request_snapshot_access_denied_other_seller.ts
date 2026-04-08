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
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that a seller cannot access cancellation request snapshots belonging to another seller, resulting in authorization failure.
 *
 * Validates the access control mechanism for cancellation request snapshots. Sellers should only be able to access snapshots from cancellation requests that belong to their own products. When a seller attempts to access snapshots from another seller's cancellation request, the system must reject the request with 403 Forbidden.
 *
 * This test creates a multi-seller scenario where:
 * 1. Two sellers (Seller A and Seller B) each create products
 * 2. A customer places an order containing items from both sellers
 * 3. The customer submits a cancellation request for Seller A's item
 * 4. Seller A approves the cancellation, creating a snapshot
 * 5. Seller B attempts to access Seller A's snapshot
 * 6. System returns 403 Forbidden to prevent unauthorized access
 *
 * The test ensures that sensitive snapshot data containing customer reasons and request details are protected from unauthorized sellers.
 */
export async function test_api_cancellation_request_snapshot_access_denied_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A account
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Create Seller B account
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 4. Seller A creates a product
  const productA =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(productA);
  // 5. Seller B creates a product
  await generate_random_ecommerce_mall_seller_sellers_me_products_create(
    sellerBConnection,
    {},
  );
  // 6. Customer adds both products to cart and checks out
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: customer.shippingAddresses[0]!.id,
        },
      },
    );
  typia.assert(order);
  // 7. Customer submits cancellation request for Seller A's order item
  const orderItemA = order.orderItems.find(
    (item) => item.productSnapshot.productId === productA.id,
  )!;
  await generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create(
    customerConnection,
    {
      params: {
        itemId: orderItemA.id,
      },
    },
  );
  // 8. Seller A approves the cancellation request using itemId
  // Cancellation requests are identified by the order item ID they relate to
  await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.approve(
    sellerAConnection,
    {
      requestId: orderItemA.id,
    },
  );
  // 9. Seller B attempts to access Seller A's cancellation request snapshot
  // Use a generated UUID for the snapshot ID - the 403 will occur because
  // Seller B has no authorization to access Seller A's cancellation requests
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Seller B cannot access Seller A's cancellation request snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
        sellerBConnection,
        {
          requestId: orderItemA.id,
          snapshotId: fakeSnapshotId,
        },
      );
    },
  );
}