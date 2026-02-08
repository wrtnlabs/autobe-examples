import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";

export async function test_api_activity_logs_analytics_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin user to obtain authorization token
  const authorized = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Define request parameters
  const actionType = "login";
  const limit = 5;
  const offset = 0;
  // Call the analytics endpoint with filtering and pagination
  const response =
    await api.functional.communityPlatform.admin.activity_logs.analytics.index(
      adminConnection,
      {
        body: {
          actionType: [actionType],
          limit,
          offset,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  // Assert response correctness
  typia.assert(response);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is 1 or 0",
    response.pagination.current === 1 || response.pagination.current === 0,
  );
  TestValidator.equals("limit matches requested", response.pagination.limit, limit);
  TestValidator.predicate("record count is non-negative", response.pagination.records >= 0);
  TestValidator.predicate("pages count is non-negative", response.pagination.pages >= 0);
  TestValidator.equals(
    "pages count matches records/limit",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / limit),
  );
  // Skipping per-entry validation of properties not declared in type
}
