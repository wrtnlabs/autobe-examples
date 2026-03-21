import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_employee_personal_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account via join authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(memberAuth);
  // Step 2: Call the timesheet list endpoint without filters
  const timesheetList: IPageIErpHrmTimesheet.ISummary =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: {} satisfies IErpHrmTimesheet.IRequest,
    });
  typia.assert(timesheetList);
  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    timesheetList.pagination !== null && timesheetList.pagination !== undefined,
  );
  // Step 4: Validate pagination fields are valid
  TestValidator.predicate(
    "pagination current is non-negative",
    timesheetList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    timesheetList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    timesheetList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    timesheetList.pagination.pages >= 0,
  );
  // Step 5: Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(timesheetList.data),
  );
  // Step 6: Validate each timesheet belongs to authenticated member
  for (const timesheet of timesheetList.data) {
    // Verify timesheet belongs to the authenticated member
    TestValidator.equals(
      "timesheet belongs to authenticated member",
      timesheet.employee.member.id,
      memberAuth.id,
    );
    // Validate employee member info exists
    TestValidator.predicate(
      "employee member exists",
      timesheet.employee.member !== null &&
        timesheet.employee.member !== undefined,
    );
    // Validate employee role exists
    TestValidator.predicate(
      "employee role exists",
      timesheet.employee.role !== null && timesheet.employee.role !== undefined,
    );
    // Validate week dates exist
    TestValidator.predicate(
      "week start date exists",
      timesheet.weekStartDate !== null && timesheet.weekStartDate !== undefined,
    );
    TestValidator.predicate(
      "week end date exists",
      timesheet.weekEndDate !== null && timesheet.weekEndDate !== undefined,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "created at exists",
      timesheet.createdAt !== null && timesheet.createdAt !== undefined,
    );
  }
}
