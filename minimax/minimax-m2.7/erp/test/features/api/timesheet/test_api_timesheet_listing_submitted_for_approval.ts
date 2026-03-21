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

export async function test_api_timesheet_listing_submitted_for_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve submitted timesheets for approval queue
  const result = await api.functional.erpHrm.admin.timesheets.index(
    adminConnection,
    {
      body: {
        status: "submitted" as const,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination",
    result.pagination !== null && result.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current",
    result.pagination.current !== null &&
      result.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    result.pagination.limit !== null && result.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    result.pagination.records !== null &&
      result.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    result.pagination.pages !== null && result.pagination.pages !== undefined,
    true,
  );
  // 4. Validate all returned timesheets have status 'submitted'
  for (const timesheet of result.data) {
    TestValidator.equals(
      "timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
    // 5. Validate timesheet summary fields
    TestValidator.equals(
      "has id",
      timesheet.id !== null && timesheet.id !== undefined,
      true,
    );
    TestValidator.equals(
      "has weekStartDate",
      timesheet.weekStartDate !== null && timesheet.weekStartDate !== undefined,
      true,
    );
    TestValidator.equals(
      "has weekEndDate",
      timesheet.weekEndDate !== null && timesheet.weekEndDate !== undefined,
      true,
    );
    TestValidator.equals(
      "has totalHours",
      timesheet.totalHours !== null && timesheet.totalHours !== undefined,
      true,
    );
    // 6. Validate employee information is included for reviewer context
    TestValidator.equals(
      "has employee info",
      timesheet.employee !== null && timesheet.employee !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has id",
      timesheet.employee.id !== null && timesheet.employee.id !== undefined,
      true,
    );
    TestValidator.equals(
      "employee has member",
      timesheet.employee.member !== null &&
        timesheet.employee.member !== undefined,
      true,
    );
  }
  // 7. Edge case: Handle empty result when no submitted timesheets exist
  const emptyResult = await api.functional.erpHrm.admin.timesheets.index(
    adminConnection,
    {
      body: {
        status: "submitted" as const,
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has valid pagination",
    emptyResult.pagination !== null && emptyResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result has no data", emptyResult.data.length, 0);
}
