import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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

/**
 * Test successful retrieval of own timesheet.
 *
 * Validates that an authenticated user can successfully retrieve their own
 * timesheet data including week boundaries, status, owner information, timelogs,
 * totalHours, and audit timestamps.
 */
export async function test_api_timesheet_retrieval_own_success(
  connection: api.IConnection,
) {
  // 1. Setup: Create employee connection
  const employeeConnection: api.IConnection = { host: connection.host };
  // Join/create employee account and login
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  // 2. Create a timesheet for the employee using utility function
  const createdTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(
      employeeConnection,
      {},
    );
  typia.assert(createdTimesheet);
  // 3. Retrieve the created timesheet using GET endpoint
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    employeeConnection,
    {
      timesheetId: createdTimesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // 4. Validate retrieved timesheet matches created timesheet
  TestValidator.equals(
    "timesheet id matches",
    retrievedTimesheet.id,
    createdTimesheet.id,
  );
  TestValidator.equals(
    "week start date matches",
    retrievedTimesheet.weekStartDate,
    createdTimesheet.weekStartDate,
  );
  TestValidator.equals(
    "week end date matches",
    retrievedTimesheet.weekEndDate,
    createdTimesheet.weekEndDate,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  TestValidator.equals(
    "organization member id matches",
    retrievedTimesheet.organizationMember.id,
    createdTimesheet.organizationMember.id,
  );
  TestValidator.predicate(
    "timelogs is array",
    Array.isArray(retrievedTimesheet.timelogs),
  );
  TestValidator.equals(
    "total hours is 0 for new timesheet",
    retrievedTimesheet.totalHours,
    0,
  );
  TestValidator.predicate(
    "createdAt is populated",
    retrievedTimesheet.createdAt !== null &&
      retrievedTimesheet.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is populated",
    retrievedTimesheet.updatedAt !== null &&
      retrievedTimesheet.updatedAt !== undefined,
  );
}
