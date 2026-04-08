import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_pagination_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin request and get authorized
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(joinConnection, {});
  // 2. Login with the newly authorized admin
  const adminConnection: api.IConnection = { host: connection.host };
  const loginCredentials: IEcommerceMallAdmin.ILogin = {
    email: authorized.email,
    password: "password",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: loginCredentials });
  // 3. Retrieve first page of audit logs with page=1 and limit=20
  const page1Body: IEcommerceMallAdminAuditLog.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const page1Response =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      { body: page1Body },
    );
  typia.assert(page1Response);
  // 4. Get pagination from response - use double assertion through unknown
  const pagination = page1Response.pagination as unknown as IPage.IPagination;
  // 5. Validate pagination metadata values
  TestValidator.equals("current page is 1", pagination.current, page1Body.page);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative integer",
    Number.isInteger(pagination.pages) && pagination.pages >= 0,
  );
  // 6. Calculate expected total pages and validate
  const expectedTotalPages =
    pagination.records === 0 ? 0 : Math.ceil(pagination.records / 20);
  TestValidator.equals(
    "total pages calculated correctly",
    pagination.pages,
    expectedTotalPages,
  );
  // 7. Validate audit log entries have all required fields
  for (const auditLog of page1Response.data) {
    // Required scalar fields
    TestValidator.predicate(
      "id is valid uuid",
      /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(auditLog.id),
    );
    TestValidator.predicate(
      "action is non-empty string",
      typeof auditLog.action === "string" && auditLog.action.length > 0,
    );
    TestValidator.predicate(
      "resourceType is non-empty string",
      typeof auditLog.resourceType === "string" &&
        auditLog.resourceType.length > 0,
    );
    TestValidator.predicate(
      "resourceId is valid uuid",
      /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(auditLog.resourceId),
    );
    TestValidator.predicate(
      "ipAddress is non-empty string",
      typeof auditLog.ipAddress === "string" && auditLog.ipAddress.length > 0,
    );
    TestValidator.predicate(
      "createdAt is valid datetime",
      !isNaN(Date.parse(auditLog.createdAt)),
    );
    // Nested admin summary
    TestValidator.predicate(
      "admin summary exists",
      auditLog.admin !== null && auditLog.admin !== undefined,
    );
    if (auditLog.admin !== null && auditLog.admin !== undefined) {
      TestValidator.predicate(
        "admin email is valid",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.admin.email),
      );
      TestValidator.predicate(
        "admin name is non-empty string",
        typeof auditLog.admin.name === "string" &&
          auditLog.admin.name.length > 0,
      );
      TestValidator.equals(
        "admin isSuperAdmin is boolean",
        typeof auditLog.admin.is_super_admin,
        "boolean",
      );
    }
  }
  // 8. Test second page if more pages exist
  if (pagination.pages > 1) {
    const page2Body: IEcommerceMallAdminAuditLog.IRequest = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    };
    const page2Response =
      await api.functional.ecommerceMall.admin.admin.audit_logs.index(
        adminConnection,
        { body: page2Body },
      );
    typia.assert(page2Response);
    // Use double assertion for page2 response
    const page2Pagination =
      page2Response.pagination as unknown as IPage.IPagination;
    // 9. Validate page 2 pagination metadata
    TestValidator.equals(
      "page 2 current page is 2",
      page2Pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit is 20", page2Pagination.limit, 20);
    TestValidator.equals(
      "page 2 total records matches page 1",
      page2Pagination.records,
      pagination.records,
    );
    TestValidator.equals(
      "page 2 total pages matches page 1",
      page2Pagination.pages,
      pagination.pages,
    );
    // 10. Verify no duplicate records between pages (offset calculation)
    const page1Ids = new Set(page1Response.data.map((log) => log.id));
    const page2Ids = new Set(page2Response.data.map((log) => log.id));
    let overlapCount = 0;
    page2Ids.forEach((id) => {
      if (page1Ids.has(id)) overlapCount++;
    });
    TestValidator.equals(
      "no overlap between page 1 and page 2",
      overlapCount,
      0,
    );
  }
  // 11. Test with different limit values
  const limit5Body: IEcommerceMallAdminAuditLog.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const limit5Response =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      { body: limit5Body },
    );
  typia.assert(limit5Response);
  // Use double assertion for limit5 response
  const limit5Pagination =
    limit5Response.pagination as unknown as IPage.IPagination;
  // 12. Validate limit=5 response
  TestValidator.equals(
    "limit 5 response limit is 5",
    limit5Pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    limit5Response.data.length <= 5,
  );
  TestValidator.equals(
    "total records unchanged with different limit",
    limit5Pagination.records,
    pagination.records,
  );
  // 13. Validate total pages increases with smaller limit
  const expectedPagesWithLimit5 =
    pagination.records === 0 ? 0 : Math.ceil(pagination.records / 5);
  TestValidator.equals(
    "total pages increases with smaller limit",
    limit5Pagination.pages,
    expectedPagesWithLimit5,
  );
  TestValidator.predicate(
    "pages with limit 5 >= pages with limit 20",
    limit5Pagination.pages >= pagination.pages,
  );
}
