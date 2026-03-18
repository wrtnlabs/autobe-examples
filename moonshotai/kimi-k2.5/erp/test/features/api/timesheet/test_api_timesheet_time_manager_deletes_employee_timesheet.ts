import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_time_manager_deletes_employee_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // Create Employee A (timesheet owner)
  const employeeAConnection: api.IConnection = { host: connection.host };
  const employeeA = await authorize_member_join(employeeAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(employeeA);
  // Create Employee B (unauthorized user attempting deletion)
  const employeeBConnection: api.IConnection = { host: connection.host };
  const employeeB = await authorize_member_join(employeeBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(employeeB);
  // Employee A creates organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeAConnection,
      {},
    );
  typia.assert(organization);
  // Employee A creates a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeAConnection,
    {
      body: {
        weekStartDate: new Date().toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Employee B attempts to delete Employee A's timesheet without permission - should fail
  await TestValidator.error(
    "Employee B cannot delete Employee A's timesheet without permission",
    async () => {
      await api.functional.erpHrm.member.timesheets.erase(employeeBConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
  // Employee A (owner) deletes their own timesheet - should succeed
  await api.functional.erpHrm.member.timesheets.erase(employeeAConnection, {
    timesheetId: timesheet.id,
  });
}
