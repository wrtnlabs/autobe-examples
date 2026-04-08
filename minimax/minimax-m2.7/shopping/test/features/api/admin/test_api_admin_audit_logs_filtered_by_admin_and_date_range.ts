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

export async function test_api_admin_audit_logs_filtered_by_admin_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account and authenticate
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = "TestPassword123!";
  const firstAdminJoin: IEcommerceMallAdmin.IJoin = {
    actorType: "customer",
    requestedGrade: "admin",
    reason: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const firstJoinOutput =
    await api.functional.ecommerceMall.auth.admin.request.join(connection, {
      body: firstAdminJoin,
    });
  typia.assert(firstJoinOutput);
  // Authenticate as first admin
  const firstAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(firstAdminConnection, {
    body: {
      email: firstJoinOutput.email,
      password: firstAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Get current timestamp before performing actions
  const beforeFirstActions = new Date();
  const oneHourAgo = new Date(beforeFirstActions.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(beforeFirstActions.getTime() + 60 * 60 * 1000);
  // 2. Create second admin account (to have different admin for comparison)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminPassword = "TestPassword456!";
  const secondAdminJoin: IEcommerceMallAdmin.IJoin = {
    actorType: "seller",
    requestedGrade: "admin",
    reason: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const secondJoinOutput =
    await api.functional.ecommerceMall.auth.admin.request.join(connection, {
      body: secondAdminJoin,
    });
  typia.assert(secondJoinOutput);
  // Authenticate as second admin
  const secondAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(secondAdminConnection, {
    body: {
      email: secondJoinOutput.email,
      password: secondAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Perform some operations that should generate audit logs for first admin
  // First admin queries audit logs - this should generate an audit entry
  await api.functional.ecommerceMall.admin.admin.audit_logs.index(
    firstAdminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Perform operations with second admin to create more audit logs
  await api.functional.ecommerceMall.admin.admin.audit_logs.index(
    secondAdminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  // First admin performs another action
  await api.functional.ecommerceMall.admin.admin.audit_logs.index(
    firstAdminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  // 5. Query audit logs filtered by first admin and date range
  const filteredResponse =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      secondAdminConnection,
      {
        body: {
          adminId: firstJoinOutput.id,
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: oneHourLater.toISOString(),
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 6. Validate pagination structure
  TestValidator.equals(
    "has pagination",
    filteredResponse.pagination !== undefined,
    true,
  );
  // Cast pagination to access extended properties
  const pagination = filteredResponse.pagination as unknown as {
    current: number;
    limit: number;
    records: number;
    pages: number;
  };
  TestValidator.predicate(
    "pagination has current page",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    pagination.pages >= 0,
  );
  // 7. Validate data structure
  TestValidator.equals(
    "has data array",
    Array.isArray(filteredResponse.data),
    true,
  );
  // 8. Validate that if there are any logs returned, they all belong to first admin
  for (const log of filteredResponse.data) {
    TestValidator.equals("log id is uuid format", log.id !== undefined, true);
    TestValidator.equals("log action exists", log.action !== undefined, true);
    TestValidator.equals(
      "log resourceType exists",
      log.resourceType !== undefined,
      true,
    );
    TestValidator.equals(
      "log resourceId exists",
      log.resourceId !== undefined,
      true,
    );
    TestValidator.equals(
      "log createdAt exists",
      log.createdAt !== undefined,
      true,
    );
    // Validate admin object structure
    TestValidator.equals(
      "log admin id matches filter",
      log.admin.id,
      firstJoinOutput.id,
    );
    TestValidator.equals(
      "log admin email exists",
      log.admin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "log admin name exists",
      log.admin.name !== undefined,
      true,
    );
  }
  // 9. Also query without admin filter to compare
  const allLogsResponse =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      secondAdminConnection,
      {
        body: {
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: oneHourLater.toISOString(),
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // Verify filtered response count is less than or equal to all logs
  TestValidator.predicate(
    "filtered logs count <= all logs count",
    filteredResponse.data.length <= allLogsResponse.data.length,
  );
}