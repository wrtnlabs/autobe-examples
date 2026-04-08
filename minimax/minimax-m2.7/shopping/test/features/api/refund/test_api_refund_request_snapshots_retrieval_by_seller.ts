import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_request_snapshots_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Add product to cart and create order
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Create order from cart
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 6. Get the order item for refund request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Request refund for the delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: {
          itemId: orderItem.id,
        },
        body: {
          reason:
            "Product does not match description - color is different from what was shown",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 8. Seller approves the refund request (this creates the snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 9. Seller retrieves refund request snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 10. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // 11. Validate snapshot structure
  const snapshot = snapshotsResponse.data[0];
  TestValidator.equals("has valid UUID id", snapshot.id !== undefined, true);
  TestValidator.equals(
    "snapshot reason matches customer input",
    snapshot.snapshotReason,
    "Product does not match description - color is different from what was shown",
  );
  TestValidator.equals(
    "snapshot status is pending at approval time",
    snapshot.snapshotStatus,
    "pending",
  );
  TestValidator.equals(
    "seller response is approved",
    snapshot.sellerResponse,
    "approved",
  );
  TestValidator.equals(
    "has customer summary",
    snapshot.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "has seller summary",
    snapshot.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "has createdAt timestamp",
    snapshot.createdAt !== undefined,
    true,
  );
  // 12. Validate pagination metadata
  TestValidator.equals(
    "pagination has current page",
    snapshotsResponse.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    snapshotsResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    snapshotsResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    snapshotsResponse.pagination.pages > 0,
    true,
  );
  // 13. Validate snapshots are ordered by createdAt descending
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = new Date(snapshotsResponse.data[i].createdAt).getTime();
      const next = new Date(snapshotsResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `snapshot ${i} should be newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
}
