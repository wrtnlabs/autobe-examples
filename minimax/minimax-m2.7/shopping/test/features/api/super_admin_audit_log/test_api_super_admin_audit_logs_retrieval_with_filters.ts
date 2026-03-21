import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_audit_logs_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Calculate date range for filtering (30 days ago to now)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Retrieve audit logs with filters
  const result =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 20,
          createdAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: now.toISOString() as string & tags.Format<"date-time">,
          action: "login",
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination.current equals request page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals request limit",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation correct",
    result.pagination.pages === 0 || result.pagination.pages >= 1,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 6. Validate each audit log entry when data exists
  if (result.data.length > 0) {
    for (const log of result.data) {
      typia.assert(log);
      // Validate required fields
      TestValidator.predicate(
        "has valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          log.id,
        ),
      );
      TestValidator.predicate("has non-empty action", log.action.length > 0);
      TestValidator.predicate("has non-empty ip", log.ip.length > 0);
      TestValidator.predicate(
        "has non-empty user_agent",
        log.user_agent.length > 0,
      );
      // Validate date range
      const logDate = new Date(log.created_at).getTime();
      TestValidator.predicate(
        "created_at within date range",
        logDate >= thirtyDaysAgo.getTime() && logDate <= now.getTime() + 1000,
      );
      // Validate superAdmin performer info
      TestValidator.predicate(
        "has superAdmin info",
        log.superAdmin !== null && log.superAdmin !== undefined,
      );
      if (log.superAdmin) {
        TestValidator.predicate(
          "superAdmin has valid id",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            log.superAdmin.id,
          ),
        );
        TestValidator.predicate(
          "superAdmin has valid email",
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(log.superAdmin.email),
        );
      }
      // Validate action matches filter when specified
      TestValidator.equals("action matches filter", log.action, "login");
    }
  }
  // 7. Test with limit filter (verify max 100)
  const maxLimitResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 100,
          createdAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: now.toISOString() as string & tags.Format<"date-time">,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit respected",
    maxLimitResult.pagination.limit,
    100,
  );
  // 8. Test with superAdminId filter
  const filteredResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 20,
          superAdminId: authorized.id,
          createdAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: now.toISOString() as string & tags.Format<"date-time">,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredResult);
  if (filteredResult.data.length > 0) {
    for (const log of filteredResult.data) {
      TestValidator.equals(
        "superAdminId filter respected",
        log.superAdmin?.id,
        authorized.id,
      );
    }
  }
  // 9. Test pagination (page 2)
  const pageTwoResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.index(
      authenticatedConnection,
      {
        body: {
          page: 2,
          limit: 20,
          createdAtFrom: thirtyDaysAgo.toISOString() as string &
            tags.Format<"date-time">,
          createdAtTo: now.toISOString() as string & tags.Format<"date-time">,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(pageTwoResult);
  TestValidator.equals(
    "pagination.current for page 2",
    pageTwoResult.pagination.current,
    2,
  );
}
