import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the includeInactive filter to verify inactive departments are properly retrieved.
 *
 * Steps:
 * 1. Authenticate as admin using authorize_admin_join
 * 2. Query departments with includeInactive=false (default - active only)
 * 3. Query departments with includeInactive=true
 * 4. Verify the filter behavior by comparing record counts
 *
 * Validations:
 * - Verify response structure is valid
 * - Verify includeInactive=true includes all departments (at least as many as false)
 * - Verify pagination records count reflects the filter correctly
 * - Verify pagination metadata is valid
 */
export async function test_api_department_list_include_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Query departments with includeInactive=false (active only)
  const activeOnlyResponse =
    await api.functional.erpHrm.admin.departments.index(adminConnection, {
      body: {
        includeInactive: false,
        limit: 100,
      } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // 3. Query departments with includeInactive=true
  const includeInactiveResponse =
    await api.functional.erpHrm.admin.departments.index(adminConnection, {
      body: {
        includeInactive: true,
        limit: 100,
      } satisfies IErpHrmDepartment.IRequest,
    });
  typia.assert(includeInactiveResponse);
  // 4. Validations
  // Verify records count with includeInactive=true >= records with includeInactive=false
  TestValidator.predicate(
    "includeInactive=true should return at least as many records as includeInactive=false",
    includeInactiveResponse.pagination.records >=
      activeOnlyResponse.pagination.records,
  );
  // Verify pagination structure is valid for includeInactive=true response
  TestValidator.predicate(
    "pagination records should be non-negative",
    includeInactiveResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    includeInactiveResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current should be non-negative",
    includeInactiveResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    includeInactiveResponse.pagination.limit > 0,
  );
  // Verify departments are returned in the data array
  TestValidator.predicate(
    "departments data array should exist",
    Array.isArray(includeInactiveResponse.data),
  );
}
