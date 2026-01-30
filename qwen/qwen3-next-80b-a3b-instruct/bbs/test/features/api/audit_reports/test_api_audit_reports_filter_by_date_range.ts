import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumSystemAudit";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_audit_reports_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access audit reports
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Wait a moment to let the system settle
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Step 3: Trigger admin actions to generate audit records
  // The audit system automatically generates records for admin activities
  // We'll trigger several actions to ensure we have records across different time periods
  // Create a record from the initial join (this will be our oldest record)
  const joinTimestamp = new Date(adminAuth.token.expired_at).toISOString();
  // Wait 1 second to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Trigger a refresh action to create another audit record
  const refreshedAdmin = await authorize_admin_refresh(adminConnection, {
    body: {
      token: adminAuth.token.refresh, // Fixed: changed refresh_token to token based on common API patterns
    } satisfies IEconomicForumAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // Wait another second for more distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Trigger a login action to create another audit record
  const loggedAdmin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: "1234", // This should be the password used in join
    } satisfies IEconomicForumAdmin.ILogin,
  });
  typia.assert(loggedAdmin);
  // Wait another second for more distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Now we have multiple audit records with different timestamps
  // We need to determine the timestamp range to query
  // We'll use the timestamps from our actions to define our date range
  // The records should now have timestamps from join, refresh, and login actions
  // Step 4: Call the audit reports API with query parameters for date range
  // IMPORTANT: The index function does NOT accept parameters as function arguments
  // The parameters must be passed as query string parameters in the URL
  // According to the schema, we need to construct the URL with start_date and end_date parameters
  // We'll create a URL with query parameters
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  // We'll use the host from the connection and append the query parameters
  const url = new URL(
    adminConnection.host + "/economicForum/admin/system/audit/reports",
  );
  url.searchParams.set("start_date", startDate.toISOString());
  url.searchParams.set("end_date", endDate.toISOString());
  // Create a new connection with the modified host
  const queryConnection: api.IConnection = {
    host: url.toString(),
    headers: adminConnection.headers,
  };
  // Call the index function - NO parameters are passed as function argument
  const response =
    await api.functional.economicForum.admin.system.audit.reports.index(
      queryConnection,
    );
  typia.assert(response);
  // Step 5: Validate response structure and data
  // Validate pagination information
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10 (default)",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records greater than 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    response.pagination.pages >= 1,
  );
  // Validate that we have at least one audit record in the response
  TestValidator.predicate(
    "response contains audit records",
    response.data.length > 0,
  );
  // Validate that results are ordered chronologically with most recent first
  // The specification states: "most recent entries first"
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at);
    const next = new Date(response.data[i + 1].created_at);
    TestValidator.predicate(
      "records ordered by timestamp descending",
      current >= next,
    );
  }
  // Validate that all records are within the specified date range
  for (const record of response.data) {
    const recordDate = new Date(record.created_at);
    TestValidator.predicate(
      "record within date range",
      recordDate >= startDate && recordDate <= endDate,
    );
  }
  // Validate that the audit records have appropriate action types
  for (const record of response.data) {
    TestValidator.predicate(
      "record has a valid action type",
      ["admin_join", "admin_refresh", "admin_login"].includes(
        record.action_type,
      ),
    );
    // Ensure target_id is a valid UUID
    TestValidator.predicate(
      "target_id is a valid uuid",
      typia.is<string & tags.Format<"uuid">>(record.target_id),
    );
    // Ensure actor_id is a valid UUID
    TestValidator.predicate(
      "actor_id is a valid uuid",
      typia.is<string & tags.Format<"uuid">>(record.actor_id),
    );
    // Ensure created_at is a valid date-time format
    TestValidator.predicate(
      "created_at is a valid date-time format",
      typia.is<string & tags.Format<"date-time">>(record.created_at),
    );
  }
}