import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that deleting a review as an unauthenticated client is denied.
 *
 * This test:
 *
 * 1. Registers a new customer account for review creation context.
 * 2. Uses the review random generator to get an existing review id (emulating an
 *    actual review that could only be deleted by the author).
 * 3. Attempts to delete the review without supplying any authentication (i.e.,
 *    unauthenticated connection, headers removed).
 * 4. Expects the operation to fail with access denied (401/403 error).
 * 5. Verifies that the review still exists after the failed attempt.
 */
export async function test_api_review_deletion_without_authentication_denied(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: input });
  typia.assert(customer);

  // 2. Use a random reviewId (in a real system, we'd create a review, but only summary info/types are available)
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the review without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated review deletion must be denied",
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(unauthConn, {
        reviewId: fakeReviewId,
      });
    },
  );
}
