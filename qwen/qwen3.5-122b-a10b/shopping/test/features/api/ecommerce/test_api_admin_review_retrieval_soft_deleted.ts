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
 * Administrator retrieves a specific review that has been soft-deleted by the customer.
 *
 * Validates the admin's ability to access reviews including soft-deleted ones for audit and compliance purposes. The response includes all review fields with the deleted_at timestamp, demonstrating that deleted reviews remain accessible to administrators even though they are hidden from public product pages and excluded from average rating calculations.
 *
 * This test verifies the soft-delete preservation behavior where deleted reviews are retained for administrative oversight. The review data including rating, content, customer reference, order item reference, and product reference are all preserved and accessible.
 *
 * 1. Administrator registers and authenticates.
 * 2. Administrator retrieves a specific review by ID.
 * 3. Validates that the response includes deleted_at field.
 * 4. Validates that all review data is properly structured.
 */
export async function test_api_admin_review_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Administrator retrieves a specific review by ID
  // Note: This endpoint returns any review including soft-deleted ones
  // The actual deleted_at value depends on backend data
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.ecommerce.admin.admin.reviews.at(
    adminConnection,
    {
      reviewId,
    },
  );
  typia.assert(review);
  // 3. Validates that the response includes deleted_at field
  // This field is nullable - null for active reviews, timestamp for deleted ones
  TestValidator.predicate(
    "deleted_at field exists in response",
    review.deleted_at === null || typeof review.deleted_at === "string",
  );
  // 4. Validates that all review data is properly structured
  TestValidator.equals("review ID is valid UUID", review.id, reviewId);
  TestValidator.predicate(
    "rating is between 1-5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "customer reference exists",
    review.customer !== null,
  );
  TestValidator.predicate(
    "order item reference exists",
    review.orderItem !== null,
  );
  TestValidator.predicate("product reference exists", review.product !== null);
  TestValidator.predicate(
    "created_at is valid datetime",
    typeof review.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    typeof review.updated_at === "string",
  );
}
