import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Administrator retrieves a specific active review by its unique identifier.
 *
 * Validates that administrators can successfully access review details including customer information, order item reference, product reference, star rating, optional text content, and all timestamps. The response must include the deleted_at field as null for active reviews.
 *
 * This test validates the primary success path for administrative review oversight where the review exists and has not been deleted by the customer.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Generate a valid review UUID for retrieval.
 * 3. Call admin review retrieval endpoint with the review ID.
 * 4. Validate response structure includes all required fields.
 * 5. Verify deleted_at is null indicating active review status.
 * 6. Confirm customer, orderItem, and product references exist.
 * 7. Validate rating is within 1-5 range.
 */
export async function test_api_admin_review_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a valid review UUID for retrieval
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call admin review retrieval endpoint
  const review = await api.functional.ecommerce.admin.admin.reviews.at(
    adminConnection,
    {
      reviewId,
    },
  );
  typia.assert(review);
  // 4. Validate response structure includes all required fields
  TestValidator.predicate("review has id", review.id !== undefined);
  TestValidator.predicate("review has customer", review.customer !== undefined);
  TestValidator.predicate(
    "review has orderItem",
    review.orderItem !== undefined,
  );
  TestValidator.predicate("review has product", review.product !== undefined);
  TestValidator.predicate("review has rating", review.rating !== undefined);
  TestValidator.predicate("review has content", review.content !== undefined);
  TestValidator.predicate(
    "review has created_at",
    review.created_at !== undefined,
  );
  TestValidator.predicate(
    "review has updated_at",
    review.updated_at !== undefined,
  );
  TestValidator.predicate(
    "review has deleted_at",
    review.deleted_at !== undefined,
  );
  // 5. Verify deleted_at is null indicating active review status
  TestValidator.equals(
    "review is active (deleted_at is null)",
    review.deleted_at,
    null,
  );
  // 6. Confirm customer, orderItem, and product references exist
  TestValidator.predicate("customer has id", review.customer.id !== undefined);
  TestValidator.predicate(
    "customer has email",
    review.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer has display_name",
    review.customer.display_name !== undefined,
  );
  TestValidator.predicate(
    "orderItem has id",
    review.orderItem.id !== undefined,
  );
  TestValidator.predicate(
    "orderItem has status",
    review.orderItem.status !== undefined,
  );
  TestValidator.predicate("product has id", review.product.id !== undefined);
  TestValidator.predicate(
    "product has name",
    review.product.name !== undefined,
  );
  // 7. Validate rating is within 1-5 range
  TestValidator.predicate(
    "rating is between 1 and 5",
    review.rating >= 1 && review.rating <= 5,
  );
}
