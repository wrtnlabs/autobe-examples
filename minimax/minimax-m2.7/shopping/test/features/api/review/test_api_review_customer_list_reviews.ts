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
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving the authenticated customer's product reviews list.
 *
 * Validates the GET /ecommerceMall/customer/customers/me/reviews endpoint which
 * returns a paginated list of product reviews written by the authenticated customer.
 * Each review includes the star rating, optional text content, product information,
 * customer info, and creation timestamp. Soft-deleted reviews are excluded from results.
 *
 * The test flow:
 * 1. Register a new customer account with email and password
 * 2. Authenticate the customer to obtain JWT token
 * 3. Call GET /ecommerceMall/customer/customers/me/reviews
 * 4. Validate the response has correct pagination structure and data format
 *
 * Since full review creation requires: seller approval → product creation →
 * order placement → shipment → delivery confirmation (APIs not available in scope),
 * this test validates the endpoint response structure for a customer with
 * no reviews (empty data array).
 *
 * **Response Validation:**
 * - HTTP 200 with paginated review list structure
 * - Pagination metadata: current page, limit, records count, total pages
 * - Reviews sorted by created_at descending (newest first)
 * - Each review: id, rating (1-5), optional content, product info, customer info, createdAt
 * - Only reviews belonging to authenticated customer returned
 * - Soft-deleted reviews excluded
 */
export async function test_api_review_customer_list_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create authenticated connection with JWT token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 3. Call GET /ecommerceMall/customer/customers/me/reviews
  const reviewListResponse =
    await api.functional.ecommerceMall.customer.customers.me.reviews.search(
      authenticatedConnection,
    );
  typia.assert(reviewListResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination metadata present",
    reviewListResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid integer",
    reviewListResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid integer",
    reviewListResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid integer",
    reviewListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid integer",
    reviewListResponse.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.equals(
    "data array exists",
    Array.isArray(reviewListResponse.data),
    true,
  );
  // 6. For new customer with no reviews, verify empty array
  // (If reviews existed, would validate each review structure)
  TestValidator.equals(
    "new customer has no reviews",
    reviewListResponse.data.length,
    0,
  );
  // 7. Validate pagination calculation
  TestValidator.predicate(
    "pages calculation correct",
    reviewListResponse.pagination.pages ===
      Math.ceil(
        reviewListResponse.pagination.records /
          reviewListResponse.pagination.limit,
      ) ||
      (reviewListResponse.pagination.records === 0 &&
        reviewListResponse.pagination.pages === 0),
  );
}
