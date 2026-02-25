import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test basic search without filters
  const basicSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns valid pagination",
    basicSearch.pagination.records >= 0,
  );
  // Test filtering by actor_type
  const actorTypeSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "admin",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(actorTypeSearch);
  // Test filtering by action_type
  const actionTypeSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "login",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeSearch);
  // Test filtering by success status
  const successSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          success: true,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(successSearch);
  // Test filtering by date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test filtering by IP address pattern
  const ipSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          ip_address: "192.168",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(ipSearch);
  // Test pagination with different page sizes
  const pageSizeSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(pageSizeSearch);
  TestValidator.equals(
    "page size matches limit",
    pageSizeSearch.pagination.limit,
    20,
  );
  // Test combination of multiple filters
  const combinedSearch =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "admin",
          action_type: "login",
          success: true,
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate audit log summary structure
  if (combinedSearch.data.length > 0) {
    const logEntry = combinedSearch.data[0];
    TestValidator.predicate("log entry has valid id", logEntry.id.length > 0);
    TestValidator.predicate(
      "log entry has actor_type",
      logEntry.actor_type.length > 0,
    );
    TestValidator.predicate(
      "log entry has action_type",
      logEntry.action_type.length > 0,
    );
    TestValidator.predicate(
      "log entry has success boolean",
      typeof logEntry.success === "boolean",
    );
    TestValidator.predicate(
      "log entry has ip_address",
      logEntry.ip_address.length > 0,
    );
    TestValidator.predicate(
      "log entry has created_at",
      logEntry.created_at.length > 0,
    );
  }
  // Test unauthorized access attempt
  await TestValidator.error("unauthorized access should fail", async () => {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await api.functional.communityPlatform.admin.audit_logs.index(
      unauthorizedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  });
}
