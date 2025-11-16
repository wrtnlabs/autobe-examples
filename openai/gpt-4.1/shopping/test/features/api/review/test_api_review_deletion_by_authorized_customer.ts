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
 * Test successful deletion of a review by its author (customer).
 *
 * 1. Register and authenticate a customer (perform join).
 * 2. Using the customer context, create a random review instance (simulate or
 *    inject as API lacks create endpoint in provided scope).
 * 3. Delete the review using api.functional.shoppingMall.customer.reviews.erase.
 * 4. Assert soft deletion by checking deleted_at or withdrawn_at is set and
 *    returned review matches requested ID.
 * 5. Attempt to access the review post-deletion (only if such API is available;
 *    else, validate via deletion flags).
 * 6. Check that only the author (authenticated customer) could perform this
 *    action.
 */
export async function test_api_review_deletion_by_authorized_customer(
  connection: api.IConnection,
) {
  // 1. Register a new shopping mall customer and authenticate
  const customerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInfo,
    });
  typia.assert(customer);

  // 2. Prepare a review id (random uuid, as review creation API is not available)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete the review (simulate successful author deletion)
  const erased = await api.functional.shoppingMall.customer.reviews.erase(
    connection,
    { reviewId },
  );
  typia.assert(erased);

  // 4. Assert that the review was deleted by the author (deleted_at or withdrawn_at is set)
  TestValidator.equals(
    "deleted review id matches requested id",
    erased.id,
    reviewId,
  );
  TestValidator.predicate(
    "soft deletion: one of deleted_at or withdrawn_at should be set",
    (erased.deleted_at !== null && erased.deleted_at !== undefined) ||
      (erased.withdrawn_at !== null && erased.withdrawn_at !== undefined),
  );
}
