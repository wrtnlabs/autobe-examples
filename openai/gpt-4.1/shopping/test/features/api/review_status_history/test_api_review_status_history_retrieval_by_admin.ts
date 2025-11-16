import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatusHistory";

/**
 * Test that an authenticated admin user can retrieve the immutable
 * status/moderation audit event for a product review.
 *
 * Steps:
 *
 * 1. Register a random admin account and obtain an authenticated session.
 * 2. With the admin token, attempt to retrieve a random review status history
 *    event using GET.
 * 3. Assert the event is attributed to the admin actor (actor_admin_id matches
 *    admin id) and expected status property is present, providing audit-grade
 *    traceability.
 */
export async function test_api_review_status_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a random admin and authenticate
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A@", // ensure complexity
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  // 2. Prepare test UUIDs for review and status history
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const statusHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve the status history event as authenticated admin
  const statusHistory: IShoppingMallReviewStatusHistory =
    await api.functional.shoppingMall.admin.reviews.statusHistories.at(
      connection,
      {
        reviewId,
        statusHistoryId,
      },
    );
  typia.assert(statusHistory);

  // 4. Business assertions: event is attributed to the admin actor, and the status property is a non-empty string.
  TestValidator.equals(
    "actor_admin_id matches admin id",
    statusHistory.actor_admin_id,
    admin.id,
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof statusHistory.status === "string" && statusHistory.status.length > 0,
  );
}
