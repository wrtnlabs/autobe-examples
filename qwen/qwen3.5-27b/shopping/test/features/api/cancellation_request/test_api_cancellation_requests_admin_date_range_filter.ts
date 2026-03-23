import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_requests_admin_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin cancellation request filtering by date ranges.
   * Validates that admins can filter cancellation requests using requested_at and responded_at date range parameters.
   */
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Define test date ranges (ISO 8601 format)
  const now = new Date();
  const today = now.toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nextWeek = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 3. Test filtering by requested_at range (requests submitted between yesterday and tomorrow)
  const requestedAtFilterResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          requested_at_from: yesterday,
          requested_at_to: tomorrow,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(requestedAtFilterResult);
  TestValidator.equals(
    "requested_at filter returns valid pagination",
    requestedAtFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "requested_at filter returns valid limit",
    requestedAtFilterResult.pagination.limit === 20,
  );
  // 4. Verify all returned requests have requested_at within the specified range
  await ArrayUtil.asyncForEach(
    requestedAtFilterResult.data,
    async (request) => {
      const requestedAt = new Date(request.requestedAt).getTime();
      const from = new Date(yesterday).getTime();
      const to = new Date(tomorrow).getTime();
      TestValidator.predicate(
        `request ${request.id} requested_at is within range`,
        requestedAt >= from && requestedAt <= to,
      );
    },
  );
  // 5. Test filtering by responded_at range (only requests where seller responded)
  const respondedAtFilterResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          responded_at_from: weekAgo,
          responded_at_to: today,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(respondedAtFilterResult);
  // 6. Verify all returned requests have responded_at not null and within range
  await ArrayUtil.asyncForEach(
    respondedAtFilterResult.data,
    async (request) => {
      TestValidator.predicate(
        `request ${request.id} has responded_at (not null)`,
        request.respondedAt !== null,
      );
      if (request.respondedAt !== null) {
        const respondedAt = new Date(request.respondedAt).getTime();
        const from = new Date(weekAgo).getTime();
        const to = new Date(today).getTime();
        TestValidator.predicate(
          `request ${request.id} responded_at is within range`,
          respondedAt >= from && respondedAt <= to,
        );
      }
    },
  );
  // 7. Test combining multiple date filters (requested in past week, responded today)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          requested_at_from: weekAgo,
          requested_at_to: today,
          responded_at_from: yesterday,
          responded_at_to: tomorrow,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // 8. Verify combined filter results
  await ArrayUtil.asyncForEach(combinedFilterResult.data, async (request) => {
    // Check requested_at range
    const requestedAt = new Date(request.requestedAt).getTime();
    const reqFrom = new Date(weekAgo).getTime();
    const reqTo = new Date(today).getTime();
    TestValidator.predicate(
      `request ${request.id} requested_at in combined range`,
      requestedAt >= reqFrom && requestedAt <= reqTo,
    );
    // Check responded_at range (must not be null)
    TestValidator.predicate(
      `request ${request.id} has responded_at`,
      request.respondedAt !== null,
    );
    if (request.respondedAt !== null) {
      const respondedAt = new Date(request.respondedAt).getTime();
      const respFrom = new Date(yesterday).getTime();
      const respTo = new Date(tomorrow).getTime();
      TestValidator.predicate(
        `request ${request.id} responded_at in combined range`,
        respondedAt >= respFrom && respondedAt <= respTo,
      );
    }
  });
  // 9. Test pagination with date filters
  const paginationTestResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          requested_at_from: weekAgo,
          requested_at_to: nextWeek,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginationTestResult);
  TestValidator.equals(
    "pagination with date filter has correct page",
    paginationTestResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination with date filter has correct limit",
    paginationTestResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    paginationTestResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paginationTestResult.pagination.pages >= 0,
  );
  // 10. Verify data array length matches limit (or less if fewer records exist)
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginationTestResult.data.length <= 10,
  );
  // 11. Test ISO 8601 date-time format validation
  await ArrayUtil.asyncForEach(
    requestedAtFilterResult.data,
    async (request) => {
      // Validate requested_at format
      TestValidator.predicate(
        `request ${request.id} requested_at is ISO 8601`,
        !isNaN(Date.parse(request.requestedAt)),
      );
      // Validate responded_at format if not null
      if (request.respondedAt !== null) {
        TestValidator.predicate(
          `request ${request.id} responded_at is ISO 8601`,
          !isNaN(Date.parse(request.respondedAt)),
        );
      }
    },
  );
  // 12. Test filtering with status parameter combined with date range
  const statusDateFilterResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          requested_at_from: weekAgo,
          requested_at_to: tomorrow,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(statusDateFilterResult);
  // Verify all results have pending status
  await ArrayUtil.asyncForEach(statusDateFilterResult.data, async (request) => {
    TestValidator.equals(
      `request ${request.id} has pending status`,
      request.status,
      "pending",
    );
  });
}
