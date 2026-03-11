import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using the join endpoint via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(adminAuth);
  // 2. Call audit logs endpoint with explicit pagination (page=1, limit=20)
  const auditLogs = await api.functional.redditPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(auditLogs);
  // 3. Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    auditLogs.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    auditLogs.pagination.pages,
    auditLogs.pagination.records === 0
      ? 0
      : Math.ceil(auditLogs.pagination.records / auditLogs.pagination.limit),
  );
  // 4. Verify audit log entries exist
  TestValidator.notEquals("has audit log data", auditLogs.data.length, 0);
  // 5. Verify each audit log entry has required fields
  for (const log of auditLogs.data) {
    typia.assert(log);
    TestValidator.predicate("log has metric_name", log.metric_name.length > 0);
    TestValidator.predicate(
      "log has metric_value",
      log.metric_value !== null && log.metric_value !== undefined,
    );
    TestValidator.predicate("log has timestamp", log.timestamp.length > 0);
    TestValidator.predicate("log has metric_type", log.metric_type.length > 0);
    // Validate optional fields if present
    if (log.context !== undefined && log.context !== null) {
      typia.assert(log.context);
      TestValidator.predicate(
        "context has at least one key",
        Object.keys(log.context).length > 0,
      );
    }
    if (log.community !== undefined && log.community !== null) {
      typia.assert(log.community);
    }
  }
  // 6. Verify sorting order (descending by timestamp)
  if (auditLogs.data.length > 1) {
    for (let i = 0; i < auditLogs.data.length - 1; i++) {
      const currentTimestamp = new Date(auditLogs.data[i].timestamp).getTime();
      const nextTimestamp = new Date(auditLogs.data[i + 1].timestamp).getTime();
      TestValidator.predicate(
        `log ${i} timestamp >= log ${i + 1} timestamp`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }
}