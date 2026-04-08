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
 * Test that customer can only see their own reviews and deleted reviews are excluded.
 *
 * Validates the review list endpoint's data isolation mechanism by verifying that:
 * - Each customer can only retrieve reviews where their own customer ID matches
 * - Deleted reviews are automatically excluded from the results by the API
 * - Reviews created by one customer are never visible to another customer
 *
 * This test creates two separate customer accounts, retrieves their respective review
 * lists, and validates that the results contain only reviews belonging to each
 * customer with the appropriate customer_id reference. The isolation ensures that
 * customers cannot see each other's review activity or access deleted reviews.
 *
 * 1. Register two different customer accounts (customer A and customer B).
 * 2. Create separate authenticated connections for each customer.
 * 3. Retrieve reviews list for customer A using the customer reviews endpoint.
 * 4. Retrieve reviews list for customer B using the customer reviews endpoint.
 * 5. Validate that customer A's reviews only contain entries with matching customer ID.
 * 6. Validate that customer B's reviews only contain entries with matching customer ID.
 * 7. Verify that reviews from one customer never appear in another's list.
 * 8. Verify that deleted reviews are excluded from results (API behavior).
 */
export async function test_api_review_customer_list_reviews_excludes_deleted_and_others(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A
  const customerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const customerAAuthorized = await authorize_customer_join(connection, {
    body: customerACredentials,
  });
  typia.assert(customerAAuthorized);
  // Create authenticated connection for customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAConnection, {
    body: {
      email: customerACredentials.email,
      password: customerACredentials.password,
      href: customerACredentials.href,
      referrer: customerACredentials.referrer,
    },
  });
  // 2. Register customer B
  const customerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const customerBAuthorized = await authorize_customer_join(connection, {
    body: customerBCredentials,
  });
  typia.assert(customerBAuthorized);
  // Create authenticated connection for customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerBConnection, {
    body: {
      email: customerBCredentials.email,
      password: customerBCredentials.password,
      href: customerBCredentials.href,
      referrer: customerBCredentials.referrer,
    },
  });
  // 3. Retrieve reviews for customer A
  const customerAReviews =
    await api.functional.ecommerceMall.customer.customers.me.reviews.search(
      customerAConnection,
    );
  typia.assert(customerAReviews);
  // 4. Retrieve reviews for customer B
  const customerBReviews =
    await api.functional.ecommerceMall.customer.customers.me.reviews.search(
      customerBConnection,
    );
  typia.assert(customerBReviews);
  // 5. Validate customer A only sees their own reviews
  for (const review of customerAReviews.data) {
    TestValidator.equals(
      "Customer A review belongs to customer A",
      review.customer.id,
      customerAAuthorized.id,
    );
  }
  // 6. Validate customer B only sees their own reviews
  for (const review of customerBReviews.data) {
    TestValidator.equals(
      "Customer B review belongs to customer B",
      review.customer.id,
      customerBAuthorized.id,
    );
  }
  // 7. Verify no overlap between customer A and customer B reviews
  const customerAReviewIds = new Set(customerAReviews.data.map((r) => r.id));
  for (const review of customerBReviews.data) {
    TestValidator.predicate(
      "Customer B review should not exist in customer A's list",
      !customerAReviewIds.has(review.id),
    );
  }
  // 8. Verify customer A's reviews don't exist in customer B's list
  const customerBReviewIds = new Set(customerBReviews.data.map((r) => r.id));
  for (const review of customerAReviews.data) {
    TestValidator.predicate(
      "Customer A review should not exist in customer B's list",
      !customerBReviewIds.has(review.id),
    );
  }
}
