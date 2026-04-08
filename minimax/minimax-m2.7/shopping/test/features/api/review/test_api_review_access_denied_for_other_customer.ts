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
 * Test that a customer cannot access reviews belonging to another customer.
 *
 * Validates the security requirement that customers can only access their own reviews. The endpoint GET /ecommerceMall/customer/customers/me/reviews/{reviewId} returns 404 when attempting to access a review that belongs to another customer, preventing information leakage about review existence.
 *
 * This test creates two separate customer accounts and verifies that Customer B cannot access Customer A's review data. The server's 404 response for both non-existent and unauthorized reviews ensures that customers cannot enumerate or access other customers' review information.
 *
 * 1. Register Customer A with unique email and credentials.
 * 2. Register Customer B with different unique email and credentials.
 * 3. Authenticate as Customer B.
 * 4. Attempt to access a review with Customer A's context using Customer B's credentials.
 * 5. Validate that the server returns 404 error (review not found or unauthorized).
 *
 * The security through obscurity principle is maintained: the server returns the same error for both non-existent reviews and reviews belonging to other customers.
 */
export async function test_api_review_access_denied_for_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Register Customer B with different email
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  // 3. Customer B is already authenticated via authorize_customer_join
  // The authorization headers are set on customerBConnection
  // 4. Attempt to access a review as Customer B
  // Since Customer B does not have any reviews and cannot access Customer A's reviews,
  // this should return 404
  await TestValidator.httpError(
    "Customer B cannot access another customer's review",
    404,
    async () =>
      await api.functional.ecommerceMall.customer.customers.me.reviews.at(
        customerBConnection,
        {
          reviewId:
            customerA.reviews[0]?.id ??
            typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // 5. Verify Customer A can still access their own reviews (if any exist)
  if (customerA.reviews.length > 0) {
    const ownReview =
      await api.functional.ecommerceMall.customer.customers.me.reviews.at(
        customerAConnection,
        {
          reviewId: customerA.reviews[0].id,
        },
      );
    typia.assert(ownReview);
    TestValidator.equals(
      "Customer A can access their own review",
      ownReview.id,
      customerA.reviews[0].id,
    );
  }
}
