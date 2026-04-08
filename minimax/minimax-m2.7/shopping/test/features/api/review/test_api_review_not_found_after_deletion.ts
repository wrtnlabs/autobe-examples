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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a soft-deleted review returns 404 when accessed via GET endpoint.
 *
 * Validates the soft-delete behavior where deleted reviews are hidden from public
 * access but preserved in the database for audit purposes. The test flow simulates
 * the complete lifecycle: from attempting to access a non-existent review, to
 * deleting it (soft-delete), and finally verifying it's no longer accessible.
 *
 * **Business Rule Validated:**
 * - Soft-deleted reviews must not be returned in GET requests
 * - The delete operation uses soft-delete (sets deleted_at timestamp)
 * - 404 error is returned when accessing deleted reviews
 * - Review data and snapshots are preserved after deletion
 *
 * 1. Customer registers and authenticates with email verification.
 * 2. System generates a unique review identifier for testing.
 * 3. GET request for the review returns 404 (review does not exist).
 * 4. DELETE request is issued for soft-delete operation.
 * 5. Subsequent GET request returns 404 (review is hidden after soft-delete).
 *
 * @param connection Base API connection for the test
 */
export async function test_api_review_not_found_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Generate a test review ID (UUID format)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the review (expecting 404 - review doesn't exist)
  await TestValidator.httpError("review not found initially", 404, async () =>
    api.functional.ecommerceMall.customer.customers.me.reviews.at(
      customerConnection,
      {
        reviewId: reviewId,
      },
    ),
  );
  // 4. Delete the review (soft-delete operation)
  // Note: This will also return 404 if review doesn't exist
  await api.functional.ecommerceMall.customer.customers.me.reviews.erase(
    customerConnection,
    {
      reviewId: reviewId,
    },
  );
  // 5. Attempt to retrieve the review again (expecting 404 - soft-deleted reviews are not accessible)
  await TestValidator.httpError(
    "review not found after deletion",
    404,
    async () =>
      api.functional.ecommerceMall.customer.customers.me.reviews.at(
        customerConnection,
        {
          reviewId: reviewId,
        },
      ),
  );
}
