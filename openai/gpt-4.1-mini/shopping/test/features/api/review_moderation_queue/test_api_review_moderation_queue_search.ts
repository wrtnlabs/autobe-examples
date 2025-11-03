import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationQueue";

/*
 * This E2E test function validates the admin workflow for searching and retrieving
 * product review moderation queue entries requiring moderation.
 *
 * It includes the following steps:
 * 1. Admin signup and authentication via the /auth/admin/join endpoint.
 * 2. Attempt to access the moderation queue with an unauthenticated connection to confirm access denial.
 * 3. Perform a variety of search requests with filtering, sorting, and pagination to ensure the API returns expected paginated entries.
 * 4. Validate that returned entries have correct structure and contain flagged product reviews.
 * 5. Validate pagination metadata for correctness.
 * 6. Validate sorting behavior by created_at ascending and descending.
 *
 * This test ensures that review moderation searching works correctly and access control is enforced.
 */
export async function test_api_review_moderation_queue_search(
  connection: api.IConnection,
) {
  // 1. Admin signup and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: "admin1234",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Test unauthorized access (unauthenticated connection with empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access fails", async () => {
    await api.functional.shoppingMall.admin.reviewModerationQueues.index(
      unauthenticatedConnection,
      {
        body: {},
      },
    );
  });

  // 3. Perform paginated search with default parameters
  const defaultSearchBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallReviewModerationQueue.IRequest;
  const resultDefault: IPageIShoppingMallReviewModerationQueue.ISummary =
    await api.functional.shoppingMall.admin.reviewModerationQueues.index(
      connection,
      {
        body: defaultSearchBody,
      },
    );
  typia.assert(resultDefault);

  // Validate pagination
  TestValidator.predicate(
    "pagination current page should be 1",
    resultDefault.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    resultDefault.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination page count is positive",
    resultDefault.pagination.pages > 0 &&
      resultDefault.pagination.pages >= resultDefault.pagination.current,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    resultDefault.pagination.records >= 0,
  );

  // Validate data structure
  for (const entry of resultDefault.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "entry has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.id,
      ),
    );
    TestValidator.predicate(
      "entry status is string and non-empty",
      typeof entry.status === "string" && entry.status.length > 0,
    );
    TestValidator.predicate(
      "entry flagged_reason is string and non-empty",
      typeof entry.flagged_reason === "string" &&
        entry.flagged_reason.length > 0,
    );
    TestValidator.predicate(
      "entry created_at is iso string",
      typeof entry.created_at === "string" &&
        Boolean(Date.parse(entry.created_at)),
    );
    if (entry.productReview !== undefined && entry.productReview !== null) {
      typia.assert(entry.productReview);
      TestValidator.predicate(
        "productReview id is UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          entry.productReview.id,
        ),
      );
    }
  }

  // 4. Search with status filter
  const statusValues = resultDefault.data
    .map((d) => d.status)
    .filter((s) => s.length > 0);
  if (statusValues.length > 0) {
    const statusToTest = RandomGenerator.pick(statusValues);
    const filteredSearchBody = {
      status: statusToTest,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallReviewModerationQueue.IRequest;

    const filteredResult =
      await api.functional.shoppingMall.admin.reviewModerationQueues.index(
        connection,
        {
          body: filteredSearchBody,
        },
      );
    typia.assert(filteredResult);

    for (const entry of filteredResult.data) {
      TestValidator.equals("filtered entry status", entry.status, statusToTest);
    }
  }

  // 5. Search with sort ascending
  const ascSortBody = {
    page: 1,
    limit: 7,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IShoppingMallReviewModerationQueue.IRequest;
  const ascSortedResult =
    await api.functional.shoppingMall.admin.reviewModerationQueues.index(
      connection,
      {
        body: ascSortBody,
      },
    );
  typia.assert(ascSortedResult);

  for (let i = 1; i < ascSortedResult.data.length; i++) {
    const prev = ascSortedResult.data[i - 1].created_at;
    const curr = ascSortedResult.data[i].created_at;
    TestValidator.predicate(
      `sorted asc created_at: previous less or equal current at index ${i}`,
      prev <= curr,
    );
  }

  // 6. Search with sort descending
  const descSortBody = {
    page: 1,
    limit: 7,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallReviewModerationQueue.IRequest;
  const descSortedResult =
    await api.functional.shoppingMall.admin.reviewModerationQueues.index(
      connection,
      {
        body: descSortBody,
      },
    );
  typia.assert(descSortedResult);

  for (let i = 1; i < descSortedResult.data.length; i++) {
    const prev = descSortedResult.data[i - 1].created_at;
    const curr = descSortedResult.data[i].created_at;
    TestValidator.predicate(
      `sorted desc created_at: previous greater or equal current at index ${i}`,
      prev >= curr,
    );
  }
}
