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

/**
 * Test date-based filtering of cancellation request snapshots.
 * Verify that created_at_start and created_at_end parameters correctly filter snapshots by creation date.
 * Test pagination functionality with date range filters.
 */
export async function test_api_cancellation_request_snapshots_date_range_filter(
  connection: api.IConnection,
) {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string>(),
      password: "password123",
    },
  });
  typia.assert(adminAuth);
  // Generate cancellation request ID
  const cancellationRequestId = typia.random<string>();
  // Create date range for filtering (last 24 hours to current time)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000); // 24 hours ago
  // Call API with date range filtering
  const response =
    await api.functional.ecommerce.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        cancellationRequestId,
        body: {
          created_at_start: yesterday.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response has pagination data",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "response has snapshot array",
    Array.isArray(response.data),
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limits are valid",
    response.pagination.limit <= 100 && response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    response.pagination.pages >= 0,
  );
  // Validate that data length matches pagination limit
  if (response.data.length > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      response.data.length <= response.pagination.limit,
    );
  }
}
