import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_log_empty_results_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Prepare restrictive filter criteria that match no records
  const futureDateFrom = new Date("2030-01-01T00:00:00.000Z").toISOString();
  const futureDateTo = new Date("2030-12-31T23:59:59.999Z").toISOString();
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentResourceId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    adminId: nonExistentAdminId,
    actionTypes: null,
    resourceTypes: null,
    resourceId: nonExistentResourceId,
    ipAddress: null,
    dateFrom: futureDateFrom,
    dateTo: futureDateTo,
    createdAt: null,
    id: null,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  // 3. Call audit logs endpoint with restrictive filters
  const response: IPageIEcommerceMallAdminAuditLog.ISummary =
    await api.functional.ecommerceMall.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: requestBody },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Verify empty results with valid pagination metadata
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records count is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    response.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit > 0,
  );
}
