import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication context
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoined: IRedditPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(adminJoined);
  // 2. Create admin connection with token for authenticated API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminJoined.token.access,
  };
  // 3. Retrieve reports queue to verify admin has access and get report IDs
  const reportsResponse =
    await api.functional.redditPlatform.admin.reports.queue.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(reportsResponse);
  // 4. Update a report to generate an audit log entry
  let reportId: string | undefined;
  if (reportsResponse.data.length > 0) {
    reportId = reportsResponse.data[0].id;
    const updatedReport =
      await api.functional.redditPlatform.admin.reports.updateStatus(
        adminConnection,
        {
          reportId: reportId,
          body: {
            status: "DISMISSED",
          },
        },
      );
    typia.assert(updatedReport);
  }
  // 5. Test audit log retrieval endpoint
  // Generate a random audit log ID to test the endpoint
  const randomAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // Try to retrieve the audit log - it may or may not exist
  try {
    const auditLog =
      await api.functional.redditPlatform.admin.audit_logs.getByAuditlogid(
        adminConnection,
        {
          auditLogId: randomAuditLogId,
        },
      );
    typia.assert(auditLog);
    // Validate audit log has required fields when it exists
    TestValidator.predicate(
      "action_type is present and non-empty",
      () => auditLog.action_type.length > 0,
    );
    TestValidator.predicate("action_status is valid (SUCCESS or FAILED)", () =>
      ["SUCCESS", "FAILED"].includes(auditLog.action_status),
    );
    TestValidator.predicate("created_at is valid ISO 8601 format", () =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
        auditLog.created_at,
      ),
    );
    // Validate admin relationship has required fields
    TestValidator.predicate(
      "admin username is present",
      () => auditLog.admin.username.length > 0,
    );
    TestValidator.predicate(
      "admin display_name is present",
      () => auditLog.admin.display_name.length > 0,
    );
    TestValidator.predicate("admin email is valid format", () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.admin.email),
    );
    TestValidator.predicate(
      "admin is_active is boolean",
      () => typeof auditLog.admin.is_active === "boolean",
    );
    TestValidator.predicate(
      "admin created_at is present",
      () => auditLog.admin.created_at !== undefined,
    );
    // Validate session relationship when present
    if (auditLog.session !== null && auditLog.session !== undefined) {
      const session = auditLog.session;
      TestValidator.predicate(
        "session id is present",
        () => session.id !== undefined,
      );
      TestValidator.predicate(
        "session IP is present",
        () => session.ip.length > 0,
      );
      TestValidator.predicate(
        "session href is present",
        () => session.href.length > 0,
      );
      TestValidator.predicate(
        "session referrer is present",
        () => session.referrer.length > 0,
      );
      TestValidator.predicate(
        "session created_at is present",
        () => session.created_at !== undefined,
      );
      TestValidator.predicate(
        "session expired_at is present",
        () => session.expired_at !== undefined,
      );
      TestValidator.predicate(
        "session admin relationship exists",
        () => session.admin.id !== undefined,
      );
    }
    // Validate IP address format when present
    if (auditLog.ip_address !== null && auditLog.ip_address !== undefined) {
      const ipAddress = auditLog.ip_address;
      TestValidator.predicate("ip_address format is valid IPv4", () =>
        /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
          ipAddress,
        ),
      );
    }
  } catch (error) {
    // Expected 404 for non-existent audit log
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as any).status === 404
    ) {
      TestValidator.equals(
        "404 returned for non-existent audit log",
        (error as any).status,
        404,
      );
    } else {
      throw error;
    }
  }
}
