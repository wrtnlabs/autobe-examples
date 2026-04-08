import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. First request: Query with date range and limit=2
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const firstRequest: IEcommerceMallAdminAuditLog.IRequest = {
    adminId: null,
    actionTypes: null,
    resourceTypes: null,
    resourceId: null,
    ipAddress: null,
    dateFrom: sevenDaysAgo.toISOString(),
    dateTo: now.toISOString(),
    createdAt: null,
    id: null,
    page: null,
    limit: 2,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  const firstResponse =
    await api.functional.ecommerceMall.admin.audit_logs.index(adminConnection, {
      body: firstRequest,
    });
  typia.assert(firstResponse);
  // 3. Validate first page
  TestValidator.predicate(
    "first page has at most 2 records",
    firstResponse.data.length <= 2,
  );
  TestValidator.predicate(
    "first page pagination current is valid",
    firstResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "first page records count is valid",
    firstResponse.pagination.records >= 0,
  );
  // If we have records, proceed with cursor pagination test
  if (firstResponse.data.length > 0) {
    const lastRecord = firstResponse.data[firstResponse.data.length - 1];
    // 4. Second request: Use cursor from last record
    const secondRequest: IEcommerceMallAdminAuditLog.IRequest = {
      adminId: null,
      actionTypes: null,
      resourceTypes: null,
      resourceId: null,
      ipAddress: null,
      dateFrom: sevenDaysAgo.toISOString(),
      dateTo: now.toISOString(),
      createdAt: lastRecord.createdAt,
      id: lastRecord.id,
      page: null,
      limit: 2,
    } satisfies IEcommerceMallAdminAuditLog.IRequest;
    const secondResponse =
      await api.functional.ecommerceMall.admin.audit_logs.index(
        adminConnection,
        { body: secondRequest },
      );
    typia.assert(secondResponse);
    // 5. Validate second page
    TestValidator.predicate(
      "second page has at most 2 records",
      secondResponse.data.length <= 2,
    );
    // Validate no duplicate records between pages
    const firstPageIds = firstResponse.data.map((r) => r.id);
    const secondPageIds = secondResponse.data.map((r) => r.id);
    const hasDuplicates = secondPageIds.some((id) => firstPageIds.includes(id));
    TestValidator.predicate(
      "no duplicate records between pages",
      !hasDuplicates,
    );
    // Validate cursor-based ordering: second page records should have createdAt <= cursor
    for (const record of secondResponse.data) {
      const recordCreatedAt = new Date(record.createdAt).getTime();
      const cursorCreatedAt = new Date(lastRecord.createdAt).getTime();
      TestValidator.predicate(
        "second page record createdAt is before or equal to cursor",
        recordCreatedAt <= cursorCreatedAt,
      );
    }
    // Validate date range filtering - all records should be within the date range
    for (const page of [firstResponse.data, secondResponse.data]) {
      for (const record of page) {
        const recordCreatedAt = new Date(record.createdAt).getTime();
        const dateFromTime = sevenDaysAgo.getTime();
        const dateToTime = now.getTime();
        TestValidator.predicate(
          "record createdAt is within date range",
          recordCreatedAt >= dateFromTime && recordCreatedAt <= dateToTime,
        );
      }
    }
  }
}
