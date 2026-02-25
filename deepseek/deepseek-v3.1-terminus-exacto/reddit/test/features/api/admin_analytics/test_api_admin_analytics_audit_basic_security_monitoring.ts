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

export async function test_api_admin_analytics_audit_basic_security_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Retrieve recent audit logs with minimal filters
  const auditConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const recentAudit =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      auditConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(recentAudit);
  // Validate pagination business logic
  TestValidator.predicate(
    "current page is valid",
    recentAudit.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    recentAudit.pagination.limit > 0 && recentAudit.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count matches data length",
    recentAudit.pagination.records >= recentAudit.data.length,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    recentAudit.pagination.pages ===
      Math.ceil(recentAudit.pagination.records / recentAudit.pagination.limit),
  );
  // Validate audit log summaries business logic
  if (recentAudit.data.length > 0) {
    const summary = recentAudit.data[0];
    TestValidator.predicate(
      "actor_type contains valid values",
      ["user", "moderator", "admin", "system"].includes(summary.actor_type),
    );
    TestValidator.predicate(
      "action_type is not empty",
      summary.action_type.length > 0,
    );
    TestValidator.predicate(
      "ip_address format is valid",
      summary.ip_address.split(".").length === 4,
    );
    TestValidator.predicate(
      "created_at is valid timestamp",
      !isNaN(new Date(summary.created_at).getTime()),
    );
  }
  // Test 2: Filter by success=true
  const successAudit =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      auditConnection,
      {
        body: {
          success: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(successAudit);
  // Validate all entries are successful
  for (const entry of successAudit.data) {
    TestValidator.predicate("entry is successful", entry.success === true);
  }
  // Test 3: Filter by success=false
  const failedAudit =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      auditConnection,
      {
        body: {
          success: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(failedAudit);
  // Validate all entries are failed
  for (const entry of failedAudit.data) {
    TestValidator.predicate("entry is failed", entry.success === false);
  }
  // Test 4: Date range filtering
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const dateRangeAudit =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      auditConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeAudit);
  // Validate chronological ordering (if multiple entries)
  if (dateRangeAudit.data.length > 1) {
    for (let i = 1; i < dateRangeAudit.data.length; i++) {
      const current = new Date(dateRangeAudit.data[i].created_at);
      const previous = new Date(dateRangeAudit.data[i - 1].created_at);
      TestValidator.predicate(
        "entries are in chronological order",
        current >= previous,
      );
    }
  }
}
