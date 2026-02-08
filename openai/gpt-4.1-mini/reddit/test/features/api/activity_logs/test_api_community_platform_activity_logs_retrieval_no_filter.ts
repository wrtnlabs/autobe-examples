import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";

export async function test_api_community_platform_activity_logs_retrieval_no_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: ICommunityPlatformAdmin.IJoin = {};
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinPayload,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Use the authorized admin connection to retrieve activity logs without filters
  const activityLogs =
    await api.functional.communityPlatform.activityLogs.index(adminConnection, {
      body: {},
    });
  typia.assert(activityLogs);
  // Validate pagination metadata presence
  TestValidator.predicate(
    "pagination object exists",
    activityLogs.pagination !== null && activityLogs.pagination !== undefined,
  );
  // Validate required pagination fields
  TestValidator.predicate(
    "pagination current page is a positive integer",
    typeof activityLogs.pagination.current === "number" &&
      activityLogs.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is a positive integer",
    typeof activityLogs.pagination.limit === "number" &&
      activityLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is a non-negative integer",
    typeof activityLogs.pagination.records === "number" &&
      activityLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is a non-negative integer",
    typeof activityLogs.pagination.pages === "number" &&
      activityLogs.pagination.pages >= 0,
  );
  // Validate that data array exists and is array
  TestValidator.predicate("data array exists", Array.isArray(activityLogs.data));
  // Validate each activity log entry is a valid object
  for (const log of activityLogs.data) {
    typia.assert(log);
  }
  // Test unauthorized access (non-admin) by creating a plain connection without auth headers
  const plainConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-admin access is forbidden", async () => {
    await api.functional.communityPlatform.activityLogs.index(plainConnection, {
      body: {},
    });
  });
}
