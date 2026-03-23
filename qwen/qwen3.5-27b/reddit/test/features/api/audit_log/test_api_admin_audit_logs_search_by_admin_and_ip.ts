import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdminAuditLog";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can search audit logs by administrator ID and IP address for forensic analysis.
 * 1. Create admin account and authenticate
 * 2. Search audit logs by admin ID
 * 3. Search audit logs by IP address
 * 4. Search with combined filters
 * 5. Verify response structure and pagination
 */
export async function test_api_admin_audit_logs_search_by_admin_and_ip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(admin);
  const adminId = admin.id;
  const adminIp = adminCreds.ip!;
  // 2. Search audit logs by admin ID
  const searchByAdminId =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        reddit_clone_admin_id: adminId,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(searchByAdminId);
  // Verify all returned logs belong to this admin
  for (const log of searchByAdminId.data) {
    TestValidator.equals(
      "log belongs to searched admin",
      log.admin.id,
      adminId,
    );
  }
  // 3. Search audit logs by IP address
  const searchByIp = await api.functional.redditClone.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        ip_address: adminIp,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    },
  );
  typia.assert(searchByIp);
  // Verify all returned logs are from this IP
  for (const log of searchByIp.data) {
    TestValidator.equals("log is from searched IP", log.ip_address, adminIp);
  }
  // 4. Search with combined filters (admin ID + IP)
  const searchCombined =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        reddit_clone_admin_id: adminId,
        ip_address: adminIp,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(searchCombined);
  // Verify combined filter returns logs matching both criteria
  for (const log of searchCombined.data) {
    TestValidator.equals(
      "combined filter: log belongs to admin",
      log.admin.id,
      adminId,
    );
    TestValidator.equals(
      "combined filter: log is from IP",
      log.ip_address,
      adminIp,
    );
  }
  // 5. Verify response structure
  TestValidator.predicate(
    "pagination has current page",
    searchByAdminId.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchByAdminId.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchByAdminId.pagination.records >= 0,
  );
  // 6. Verify audit log entry structure (if data exists)
  if (searchByAdminId.data.length > 0) {
    const sampleLog = searchByAdminId.data[0];
    TestValidator.predicate(
      "log has valid ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleLog.id,
      ),
    );
    TestValidator.predicate(
      "log has action type",
      sampleLog.action_type.length > 0,
    );
    TestValidator.predicate(
      "log has target type",
      sampleLog.target_type.length > 0,
    );
    TestValidator.predicate(
      "log has valid timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sampleLog.created_at),
    );
    TestValidator.equals(
      "log admin email matches",
      sampleLog.admin.email,
      admin.email,
    );
  }
  // 7. Test pagination with different page
  const page2 = await api.functional.redditClone.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        reddit_clone_admin_id: adminId,
        page: 2,
        limit: 10,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 10);
  // 8. Test text search on details field
  const searchText = "test";
  const searchByText = await api.functional.redditClone.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        search: searchText,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    },
  );
  typia.assert(searchByText);
  TestValidator.predicate(
    "text search returns valid pagination",
    searchByText.pagination.current >= 1,
  );
}
