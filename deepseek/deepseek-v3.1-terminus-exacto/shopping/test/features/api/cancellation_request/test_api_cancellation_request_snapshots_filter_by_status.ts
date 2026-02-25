import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshots_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Step 2: Use a test cancellation request ID (random, assume it exists in test env)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define test statuses to filter by
  const testStatuses = ["pending", "approved", "completed"] as const;
  // Step 4: Get baseline - query without status filter
  const baselineResponse =
    await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {},
      },
    );
  typia.assert(baselineResponse);
  // Store baseline counts by status for validation
  const baselineCounts = new Map<string, number>();
  for (const snapshot of baselineResponse.data) {
    baselineCounts.set(
      snapshot.status,
      (baselineCounts.get(snapshot.status) ?? 0) + 1,
    );
  }
  // Step 5: Test each status filter independently
  for (const status of testStatuses) {
    const filteredResponse =
      await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
        adminConnection,
        {
          cancellationRequestId,
          body: {
            status,
          } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate that all returned snapshots match the filter status
    TestValidator.equals(
      `all snapshots have status ${status}`,
      filteredResponse.data.every((s) => s.status === status),
      true,
    );
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for ${status}`,
      filteredResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      `pagination limit positive for ${status}`,
      filteredResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      `total records non-negative for ${status}`,
      filteredResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `total pages non-negative for ${status}`,
      filteredResponse.pagination.pages >= 0,
    );
    // Check that filtered count <= baseline count for this status
    const baselineCount = baselineCounts.get(status) ?? 0;
    TestValidator.predicate(
      `filtered count (${filteredResponse.pagination.records}) ≤ baseline count (${baselineCount}) for status ${status}`,
      filteredResponse.pagination.records <= baselineCount,
    );
    // Validate that each item in filtered results exists in baseline (by ID)
    if (filteredResponse.data.length > 0) {
      const baselineIds = new Set(baselineResponse.data.map((s) => s.id));
      TestValidator.equals(
        `all filtered snapshot IDs exist in baseline for ${status}`,
        filteredResponse.data.every((s) => baselineIds.has(s.id)),
        true,
      );
    }
  }
  // Step 6: Test combined filter (date range with status) to ensure filters work together
  const combinedResponse =
    await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          status: "pending",
          created_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter results
  if (combinedResponse.data.length > 0) {
    TestValidator.equals(
      "all combined filtered snapshots have pending status",
      combinedResponse.data.every((s) => s.status === "pending"),
      true,
    );
    // Validate dates are within range
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    for (const snapshot of combinedResponse.data) {
      const createdAt = new Date(snapshot.created_at);
      TestValidator.predicate(
        `snapshot ${snapshot.id} created within date range`,
        createdAt >= startDate && createdAt <= endDate,
      );
    }
  }
  // Step 7: Test pagination behavior
  const paginationResponse =
    await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination page 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit 5",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination data length ≤ limit",
    paginationResponse.data.length <= paginationResponse.pagination.limit,
  );
}
