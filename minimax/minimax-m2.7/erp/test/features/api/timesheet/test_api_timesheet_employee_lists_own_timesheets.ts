import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_employee_lists_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member without time:approve permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create multiple draft timesheets for the authenticated employee
  const timesheetCount = 3;
  const createdTimesheets = await ArrayUtil.asyncRepeat(
    timesheetCount,
    async () => {
      const timesheet = await generate_random_erp_hrm_member_timesheets_create(
        memberConnection,
        {},
      );
      typia.assert(timesheet);
      return timesheet;
    },
  );
  // 3. Request timesheets with empty body (should return only authenticated employee's timesheets)
  const response = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(response);
  // Validation Point 1: Request with empty body returns only the authenticated employee's timesheets
  TestValidator.equals("response has data", response.data.length > 0, true);
  // Validation Point 2: Response includes pagination metadata with correct total count
  TestValidator.equals(
    "pagination records matches created timesheets",
    response.pagination.records >= timesheetCount,
    true,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    response.pagination.pages >= 1,
  );
  // Validation Point 3 & 4: Each timesheet belongs to the authenticated employee (data isolation)
  // Use authorized.id (member ID) and authorized.email for comparison
  for (const ts of response.data) {
    TestValidator.equals(
      "employee id matches authenticated member",
      ts.employee.member.id,
      authorized.id,
    );
    TestValidator.equals(
      "employee email matches",
      ts.employee.member.email,
      authorized.email,
    );
  }
  // Validation Point 5: Other employees' timesheets are NOT included
  TestValidator.predicate("only own timesheets returned", () =>
    response.data.every((ts) => ts.employee.member.id === authorized.id),
  );
}
