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
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the empty state when customer has no cancellation requests.
 *
 * Validates that a newly registered customer with no order history returns an empty
 * cancellation request list. This test verifies the API correctly handles the empty
 * state scenario by returning an empty data array with pagination metadata showing
 * zero records and zero pages.
 *
 * **Test Flow:**
 * 1. Register a new customer account with valid credentials
 * 2. Create authenticated connection with the customer's JWT token
 * 3. Call GET /customers/me/cancellation-requests endpoint
 * 4. Validate response contains empty data array
 * 5. Validate pagination metadata shows total records = 0
 * 6. Validate total pages = 0
 * 7. Verify the response structure matches IPageIEcommerceMallCancellationRequest
 *
 * **Expected Behavior:**
 * - The data array should be empty (no cancellation requests exist)
 * - Pagination records should be 0
 * - Pagination pages should be 0
 * - No HTTP errors should be thrown
 *
 * 1. Customer registers with email/password via POST /auth/customer/join
 * 2. System creates customer account and returns JWT token
 * 3. Customer calls GET /customers/me/cancellation-requests
 * 4. System returns empty list with pagination showing 0 records
 */
export async function test_api_cancellation_request_list_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with no order history
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call GET /customers/me/cancellation-requests endpoint
  const response =
    await api.functional.ecommerceMall.customer.customers.me.cancellation_requests.list(
      customerConnection,
    );
  // 3. Validate response structure with typia.assert
  typia.assert(response);
  // 4. Validate empty state - data array should be empty
  TestValidator.equals(
    "data array should be empty for new customer",
    response.data,
    [],
  );
  // 5. Validate pagination metadata shows zero records
  TestValidator.equals(
    "total records should be 0 for customer with no requests",
    response.pagination.records,
    0,
  );
  // 6. Validate total pages should be 0 when no records exist
  TestValidator.equals(
    "total pages should be 0 when no records exist",
    response.pagination.pages,
    0,
  );
  // 7. Validate current page is at least 0 (valid pagination state)
  TestValidator.predicate(
    "current page should be valid non-negative number",
    response.pagination.current >= 0,
  );
  // 8. Validate limit is a positive number
  TestValidator.predicate(
    "limit should be positive number",
    response.pagination.limit > 0,
  );
}
