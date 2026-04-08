import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_audit_logs_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test default pagination (newest first by default)
  const defaultResult =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate default sort is descending (newest first)
  if (defaultResult.data.length > 1) {
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      const current = new Date(defaultResult.data[i].createdAt).getTime();
      const next = new Date(defaultResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "default sort descending (newest first)",
        current >= next,
      );
    }
  }
  // 3. Test ascending sort order (oldest first)
  const ascendingResult =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(ascendingResult);
  // Validate ascending sort
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].createdAt).getTime();
      const next = new Date(ascendingResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate("ascending sort (oldest first)", current <= next);
    }
  }
  // 4. Test descending sort order explicitly
  const descendingResult =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(descendingResult);
  // Validate descending sort
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].createdAt).getTime();
      const next = new Date(descendingResult.data[i + 1].createdAt).getTime();
      TestValidator.predicate("explicit descending sort", current >= next);
    }
  }
  // 5. Test pagination metadata with page 1
  const page1Result = typia.assert(defaultResult);
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit",
    page1Result.pagination.pagination.limit,
    20,
  );
  // 6. Test with limit of 100 (maximum)
  const maxLimitResult =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit value",
    maxLimitResult.pagination.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data count not exceeding limit",
    maxLimitResult.data.length <= 100,
  );
  // 7. Test with limit of 1 (minimum meaningful)
  const minLimitResult =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit value",
    minLimitResult.pagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit returns at most 1 record",
    minLimitResult.data.length <= 1,
  );
  // 8. Test page 2+ if there are enough records
  if (page1Result.pagination.pagination.pages >= 2) {
    const page2Result =
      await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IEcommerceMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit",
      page2Result.pagination.pagination.limit,
      10,
    );
    // Verify total pages consistent
    TestValidator.equals(
      "total pages consistent",
      page2Result.pagination.pagination.pages,
      page1Result.pagination.pagination.pages,
    );
    // Verify records consistent
    TestValidator.equals(
      "total records consistent",
      page2Result.pagination.pagination.records,
      page1Result.pagination.pagination.records,
    );
  }
  // 9. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    page1Result.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page1Result.pagination.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Result.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Result.pagination.pagination.pages >= 0,
  );
  // 10. Validate records calculation
  if (page1Result.pagination.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1Result.pagination.pagination.records /
        page1Result.pagination.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      page1Result.pagination.pagination.pages,
      expectedPages,
    );
  }
}
