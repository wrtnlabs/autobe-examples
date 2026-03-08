import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join to create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAccount);
  // Create admin connection with token for authenticated requests
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...adminConnection.headers,
      Authorization: adminAccount.token.access,
    },
  };
  // 2. Test filter combinations
  // Test 2.1: Filter by action_type only
  const actionTypeFilters = [
    "USER_SUSPEND",
    "POST_DELETE",
    "COMMUNITY_MODERATE",
  ];
  for (const actionType of actionTypeFilters) {
    const result = await api.functional.redditPlatform.admin.audit_logs.index(
      authConnection,
      {
        body: {
          actionType,
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformAdminAuditLog.IRequest,
      },
    );
    typia.assert(result);
    // Validate all entries match action_type filter
    for (const entry of result.data) {
      TestValidator.equals(
        `action_type filter: ${actionType}`,
        entry.action_type,
        actionType,
      );
    }
  }
  // Test 2.2: Filter by date range only
  const now = new Date();
  const startDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const endDate = now;
  const dateRangeResult =
    await api.functional.redditPlatform.admin.audit_logs.index(authConnection, {
      body: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformAdminAuditLog.IRequest,
    });
  typia.assert(dateRangeResult);
  // Validate all entries are within date range
  for (const entry of dateRangeResult.data) {
    const entryDate = new Date(entry.created_at);
    TestValidator.predicate("created_at >= startDate", entryDate >= startDate);
    TestValidator.predicate("created_at <= endDate", entryDate <= endDate);
  }
  // Test 2.3: Filter by action_type and target_entity_type together
  const combinedResult =
    await api.functional.redditPlatform.admin.audit_logs.index(authConnection, {
      body: {
        actionType: "USER_SUSPEND",
        targetEntityType: "USER",
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformAdminAuditLog.IRequest,
    });
  typia.assert(combinedResult);
  // Validate all entries match both filters (handle nullable target_entity_type)
  for (const entry of combinedResult.data) {
    TestValidator.equals(
      "combined filter: action_type",
      entry.action_type,
      "USER_SUSPEND",
    );
    TestValidator.equals(
      "combined filter: target_entity_type",
      entry.target_entity_type,
      "USER",
    );
  }
  // Test 3: Validate audit_log_type field
  const allLogsResult =
    await api.functional.redditPlatform.admin.audit_logs.index(authConnection, {
      body: {
        limit: 50,
        page: 1,
      } satisfies IRedditPlatformAdminAuditLog.IRequest,
    });
  typia.assert(allLogsResult);
  // Check that audit_log_type is either ADMIN or MODERATOR
  for (const entry of allLogsResult.data) {
    TestValidator.predicate(
      "audit_log_type is valid",
      entry.audit_log_type === "ADMIN" || entry.audit_log_type === "MODERATOR",
    );
  }
}