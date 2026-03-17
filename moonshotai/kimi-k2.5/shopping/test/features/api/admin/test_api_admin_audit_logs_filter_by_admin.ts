import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_admin_audit_logs_filter_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin joins and authenticates
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {});
  typia.assert(admin1);
  // 2. Second admin joins and authenticates
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  typia.assert(admin2);
  // 3. First admin creates a category (generates audit log entry)
  const category1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      admin1Connection,
      {},
    );
  typia.assert(category1);
  // 4. Second admin creates a category (generates audit log entry)
  const category2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      admin2Connection,
      {},
    );
  typia.assert(category2);
  // 5. First admin calls audit-logs index filtering by adminId={first_admin_id}
  const auditLogs = await api.functional.ecommerceMall.admin.audit_logs.index(
    admin1Connection,
    {
      body: {
        adminId: admin1.id,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(auditLogs);
  // 6. Validation
  // Verify only audit logs performed by the specified admin are returned
  TestValidator.predicate("all audit logs belong to admin1", () =>
    auditLogs.data.every((log) => log.admin.id === admin1.id),
  );
  // Verify the action field reflects what was performed (create_category)
  TestValidator.predicate("contains create_category action", () =>
    auditLogs.data.some((log) => log.action === "create_category"),
  );
  // Verify the returned audit logs show the correct admin reference
  TestValidator.predicate("admin reference matches admin1", () =>
    auditLogs.data.some(
      (log) => log.admin.id === admin1.id && log.admin.email === admin1.email,
    ),
  );
  // Verify metadata shows correct pagination info
  TestValidator.equals(
    "pagination current page",
    auditLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", auditLogs.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has at least 1 record",
    () => auditLogs.pagination.records >= 1,
  );
  // Test filtering by resourceId also works
  const auditLogsByResource =
    await api.functional.ecommerceMall.admin.audit_logs.index(
      admin1Connection,
      {
        body: {
          resourceId: category1.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsByResource);
  // Verify filtering by resourceId returns the correct audit log
  TestValidator.predicate("resource filter returns correct logs", () =>
    auditLogsByResource.data.every((log) => log.resourceId === category1.id),
  );
}
