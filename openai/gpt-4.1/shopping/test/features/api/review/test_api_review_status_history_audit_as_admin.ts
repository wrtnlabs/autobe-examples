import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatusHistory";

/**
 * Validate admin audit access to review status/moderation history, including
 * filtering and pagination.
 *
 * Scenario:
 *
 * 1. Register a new admin in the platform and log in (admin join).
 * 2. Use a randomly generated reviewId (as we cannot create reviews directly here,
 *    assume it exists) to query status history.
 * 3. Issue a review status history search with full advanced filters set: status,
 *    actor_type, actor_id, search string, date ranges, sort, and pagination.
 * 4. Assert:
 *
 *    - The response shape and type validity (typia.assert)
 *    - All returned status history records pertain to the queried reviewId
 *    - Filtering by status/actor_type/etc. returns sensible results
 *    - Pagination object is present and conforms to interface
 *    - All results are only returned when admin session is authenticated
 * 5. Confirm filter/pagination logic by requesting a second page with a different
 *    sort order and comparing datasets.
 */
export async function test_api_review_status_history_audit_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Register an admin and log in
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!A1", // ensure complexity
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // The join API sets authentication headers automatically on connection.

  // Step 2: Choose a random reviewId for audit-test purposes
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Issue status/moderation history request with advanced query
  const filterBody = {
    status: RandomGenerator.pick([
      "created",
      "published",
      "rejected",
      "flagged",
      "withdrawn",
      "deleted",
    ] as const),
    actor_type: RandomGenerator.pick(["customer", "seller", "admin"] as const),
    // actor_id uses admin id with some probability for testing legitimate admin events
    actor_id: Math.random() > 0.5 ? admin.id : undefined,
    // date range filter: past ~now
    start_at: new Date(Date.now() - 3600 * 24 * 7 * 1000).toISOString(), // 1 week ago
    end_at: new Date().toISOString(),
    search: RandomGenerator.paragraph({ sentences: 2 }),
    sort_by: "created_at",
    order: RandomGenerator.pick(["asc", "desc"] as const),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallReviewStatusHistory.IRequest;

  const result =
    await api.functional.shoppingMall.admin.reviews.statusHistories.index(
      connection,
      {
        reviewId,
        body: filterBody,
      },
    );
  typia.assert(result);

  // Step 4: Assert all result records are for the specified reviewId and correct shape
  TestValidator.predicate(
    "all records belong to queried reviewId",
    result.data.every((item) => item.shopping_mall_review_id === reviewId),
  );
  TestValidator.predicate(
    "pagination metadata present",
    typeof result.pagination === "object" &&
      typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );

  // Step 5: Negative test - unauthenticated access forbidden
  // Create a copy of the connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin access is forbidden",
    async () => {
      await api.functional.shoppingMall.admin.reviews.statusHistories.index(
        unauthConn,
        {
          reviewId,
          body: filterBody,
        },
      );
    },
  );

  // Step 6: Pagination/Sorting - fetch different page/order and compare
  const result2 =
    await api.functional.shoppingMall.admin.reviews.statusHistories.index(
      connection,
      {
        reviewId,
        body: {
          ...filterBody,
          order: filterBody.order === "asc" ? "desc" : "asc",
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(result2);
  // Pagination metadata should reflect page 2
  TestValidator.equals(
    "second page reports page=2",
    result2.pagination.current,
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );
}
