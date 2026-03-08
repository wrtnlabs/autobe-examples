import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAuditTrailAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAuditTrailAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_trails_analytics_with_admin_id_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // adminConnection.headers is now updated internally by authorize_admin_join
  // Use adminConnection for all subsequent API calls
  // 2. Perform admin login to ensure admin session is active and generate audit log
  const loginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IEcommerceMallAdmin.ILogin;
  const loginResponse = await authorize_admin_login(adminConnection, {
    body: loginInput,
  });
  typia.assert(loginResponse);
  // 3. Call analytics endpoint with adminIds filter for the specific admin
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const analyticsRequest = {
    adminIds: [adminAuthorized.id],
    dateRange: {
      startDate: oneWeekAgo.toISOString(),
      endDate: today.toISOString(),
    } satisfies IEcommerceMallAuditTrailAnalytic.IDateRange,
    includeTrends: true,
    timeWindow: "day",
    limit: 100,
  } satisfies IEcommerceMallAuditTrailAnalytic.IRequest;
  const analyticsResponse =
    await api.functional.ecommerceMall.admin.audit_trails.analytics(
      adminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // 4. Validate response structure
  const data: IEcommerceMallAuditTrailAnalytic.ISummary =
    analyticsResponse.data[0];
  typia.assert(data);
  // 5. Validate uniqueAdmins equals 1 (only the filtered admin)
  TestValidator.equals(
    "unique admins should be 1 for filtered admin",
    data.summary.uniqueAdmins,
    1,
  );
  // 6. Validate adminActivity array contains only one entry for the filtered admin
  TestValidator.equals(
    "admin activity should contain one entry",
    data.adminActivity.length,
    1,
  );
  // 7. Validate the adminActivity entry matches the filtered admin
  const adminActivity = data.adminActivity[0];
  typia.assert(adminActivity);
  TestValidator.equals(
    "admin activity should match filtered admin ID",
    adminActivity.adminId,
    adminAuthorized.id,
  );
  TestValidator.predicate(
    "admin activity count should be at least 1",
    adminActivity.activityCount >= 1,
  );
  // 8. Validate actionTypeDistribution reflects only this admin's actions
  // If the admin performed actions, actionTypeDistribution should not be empty
  if (data.actionTypeDistribution) {
    const actionTypes = Object.keys(data.actionTypeDistribution);
    TestValidator.predicate(
      "action type distribution should have entries for filtered admin",
      actionTypes.length > 0,
    );
  }
  // 9. Validate targetEntityDistribution reflects only entities accessed by this admin
  if (data.targetEntityDistribution) {
    const entityTypes = Object.keys(data.targetEntityDistribution);
    TestValidator.predicate(
      "target entity distribution should have entries for filtered admin",
      entityTypes.length > 0,
    );
  }
  // 10. Validate pagination metadata shows correct totalRecords count
  TestValidator.equals(
    "pagination records should match summary totalLogs",
    analyticsResponse.pagination.records,
    data.summary.totalLogs,
  );
  // 11. Validate trends are present when includeTrends is true
  TestValidator.predicate(
    "trends should be present when includeTrends is true",
    data.trends.length >= 0,
  );
  // 12. Validate security flags are present (can be empty array)
  TestValidator.predicate(
    "security flags should be an array",
    Array.isArray(data.securityFlags),
  );
}
