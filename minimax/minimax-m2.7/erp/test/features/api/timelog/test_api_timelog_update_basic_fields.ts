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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test updating basic timelog fields (date, duration_minutes, description, billable) on a draft timelog not associated with any timesheet.
 *
 * 1. Authenticate as member using /erpHrm/auth/member/join
 * 2. Create a project using /erpHrm/member/projects
 * 3. Create a timelog using /erpHrm/member/timelogs with project_id, date, duration_minutes
 * 4. Update the timelog using PUT /erpHrm/member/timelogs/{timelogId} with:
 *    - New date value (different from original)
 *    - New duration_minutes value
 *    - New description text
 *    - billable flag toggled
 * 5. Verify the response returns the updated timelog with all modified fields reflecting new values
 * 6. Verify updated_at timestamp is set to current time
 * 7. Verify project and employee associations remain unchanged
 */
export async function test_api_timelog_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  memberConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 3. Create initial timelog
  const originalDate = new Date();
  originalDate.setDate(originalDate.getDate() - 1);
  const originalTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: originalDate.toISOString(),
        durationMinutes: 60,
        billable: true,
      },
    },
  );
  typia.assert(originalTimelog);
  // 4. Update the timelog with new values
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - 3);
  const newDurationMinutes = 120;
  const newDescription = "Updated work description for testing";
  const newBillable = false;
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: originalTimelog.id,
      body: {
        date: newDate.toISOString(),
        duration_minutes: newDurationMinutes satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        description: newDescription,
        billable: newBillable,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 5. Verify all modified fields reflect new values
  TestValidator.equals(
    "date updated",
    updatedTimelog.date,
    newDate.toISOString(),
  );
  TestValidator.equals(
    "duration_minutes updated",
    updatedTimelog.duration_minutes,
    newDurationMinutes,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    newDescription,
  );
  TestValidator.equals(
    "billable toggled",
    updatedTimelog.billable,
    newBillable,
  );
  // 6. Verify updated_at timestamp is set (should be different from created_at)
  TestValidator.predicate(
    "updated_at is set",
    updatedTimelog.updated_at !== originalTimelog.created_at,
  );
  // 7. Verify project and employee associations remain unchanged
  TestValidator.equals(
    "project unchanged",
    updatedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    originalTimelog.employee.id,
  );
}
