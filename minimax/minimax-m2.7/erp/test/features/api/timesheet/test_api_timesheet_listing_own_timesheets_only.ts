import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_timesheet_listing_own_timesheets_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via /erpHrm/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Send PATCH request with no filters - verify data isolation
  const noFilterResult = await api.functional.erpHrm.admin.timesheets.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(noFilterResult);
  // Validate pagination structure is correct
  TestValidator.equals(
    "pagination current is positive",
    noFilterResult.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is positive",
    noFilterResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    noFilterResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    noFilterResult.pagination.pages >= 0,
    true,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(noFilterResult.data));
  TestValidator.equals(
    "data length matches pagination records",
    noFilterResult.data.length,
    Math.min(
      noFilterResult.pagination.records,
      noFilterResult.pagination.limit,
    ),
  );
  // 3. Send PATCH request with employeeId filter for a DIFFERENT employee
  // For non-approver users, this filter should be silently ignored (no error)
  const anotherEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const filteredResult = await api.functional.erpHrm.admin.timesheets.index(
    adminConnection,
    {
      body: {
        employeeId: anotherEmployeeId,
      },
    },
  );
  typia.assert(filteredResult);
  // The key validation: employeeId filter is SILENTLY IGNORED for non-approver
  // Results should be identical to no-filter case (scoped to own timesheets)
  TestValidator.equals(
    "filtered result record count matches no-filter (filter ignored)",
    filteredResult.pagination.records,
    noFilterResult.pagination.records,
  );
  TestValidator.equals(
    "filtered result data length matches no-filter",
    filteredResult.data.length,
    noFilterResult.data.length,
  );
  // 4. Test pagination within scoped results
  const paginatedResult = await api.functional.erpHrm.admin.timesheets.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit respects page size",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page is set correctly",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedResult.data.length <= 5,
  );
  // 5. Edge case: admin with no timesheets - empty array with 0 records pagination
  // This is implicitly tested when pagination.records === 0
  if (noFilterResult.pagination.records === 0) {
    TestValidator.equals(
      "empty result has zero data",
      noFilterResult.data.length,
      0,
    );
    TestValidator.equals(
      "empty result has zero pages",
      noFilterResult.pagination.pages,
      0,
    );
  }
}
