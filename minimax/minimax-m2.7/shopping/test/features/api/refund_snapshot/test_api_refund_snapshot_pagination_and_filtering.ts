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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a super administrator can filter and paginate refund request snapshots effectively.
 *
 * Validates the super admin's ability to query refund request snapshots using filtering and pagination parameters. The test verifies that the PATCH endpoint correctly processes snapshotStatus and sellerResponse filters, respects pagination limits, and returns accurate pagination metadata.
 *
 * **Setup Flow:**
 * 1. Super admin registers and authenticates to access admin endpoints.
 * 2. Customer registers and authenticates to create orders and request refunds.
 * 3. Customer creates a shipping address for order delivery.
 * 4. Customer places an order which creates order items with product snapshots.
 * 5. Customer submits a refund request for an order item, creating initial refund request.
 *
 * **Test Execution:**
 * 6. Super admin calls the snapshot retrieval endpoint with various filter and pagination combinations.
 *
 * **Validation Points:**
 * - Response structure matches IPageIEcommerceMallRefundRequestSnapshot.ISummary
 * - Pagination metadata is accurate (current, limit, records, pages)
 * - Filtering by snapshotStatus and sellerResponse works correctly
 * - Empty result sets return valid structure with records=0
 */
export async function test_api_refund_snapshot_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Customer creates shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
          city: "Seoul",
          state: "Gangnam-gu",
          postal_code: "06012",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 4. Customer creates order via generation utility
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get an order item from the order
  if (order.orderItems && order.orderItems.length > 0) {
    const orderItem = order.orderItems[0];
    // 5. Customer submits refund request for order item
    const refundRequest =
      await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
        customerConnection,
        {
          params: {
            itemId: orderItem.id,
          },
        },
      );
    typia.assert(refundRequest);
    // 6. Super admin retrieves snapshots with filtering and pagination
    const snapshotsResponse =
      await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
        superAdminConnection,
        {
          requestId: refundRequest.id,
          body: {
            page: 1,
            limit: 5,
            snapshotStatus: "pending",
            sellerResponse: "approved",
          },
        },
      );
    typia.assert(snapshotsResponse);
    // 7. Validate pagination metadata structure
    TestValidator.equals(
      "pagination current is 1",
      snapshotsResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit is 5",
      snapshotsResponse.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      snapshotsResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      snapshotsResponse.pagination.pages >= 0,
    );
    // 8. Validate data array exists and is array
    TestValidator.predicate(
      "data array exists",
      Array.isArray(snapshotsResponse.data),
    );
    // 9. Validate data array length respects limit
    if (snapshotsResponse.pagination.records > 0) {
      TestValidator.predicate(
        "data length respects limit",
        snapshotsResponse.data.length <= 5,
      );
    }
    // 10. Test with different filter combination to get empty results
    const emptyFilterResponse =
      await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.index(
        superAdminConnection,
        {
          requestId: refundRequest.id,
          body: {
            page: 1,
            limit: 5,
            snapshotStatus: "nonexistent_status",
          },
        },
      );
    typia.assert(emptyFilterResponse);
    // Empty results should still have valid pagination structure
    TestValidator.equals(
      "empty result records is 0",
      emptyFilterResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result pages is 0",
      emptyFilterResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result data is empty array",
      emptyFilterResponse.data.length,
      0,
    );
    // 11. Test pagination metadata calculation
    // When records > 0 and limit = 5, pages should be at least 1
    // When records = 0, pages should be 0
    if (snapshotsResponse.pagination.records > 0) {
      TestValidator.predicate(
        "pages >= 1 when records > 0",
        snapshotsResponse.pagination.pages >= 1,
      );
      // Pages should be calculated as ceiling(records / limit)
      const expectedPages = Math.ceil(
        snapshotsResponse.pagination.records /
          snapshotsResponse.pagination.limit,
      );
      TestValidator.equals(
        "pages calculation is correct",
        snapshotsResponse.pagination.pages,
        expectedPages,
      );
    }
  }
}
