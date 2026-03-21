import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_project_reassignment_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member (employee is automatically created)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create first active project
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        description: "First project for timelog reassignment test",
      },
    },
  );
  typia.assert(project1);
  // 3. Create second active project
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3357FF",
        description: "Second project for timelog reassignment test",
      },
    },
  );
  typia.assert(project2);
  // 4. Create a timelog entry associated with the first project
  const originalTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        date: new Date().toISOString(),
        duration: 120,
        description: "Work on first project",
        billable: true,
      },
    },
  );
  typia.assert(originalTimelog);
  // Store original values for comparison
  const originalDuration = originalTimelog.duration;
  const originalDescription = originalTimelog.description;
  const originalBillable = originalTimelog.billable;
  const originalDate = originalTimelog.date;
  // 5. Update the timelog by reassigning to the second project
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: originalTimelog.id,
      body: {
        projectId: project2.id,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 6. Validate the project reassignment
  TestValidator.equals(
    "project should be reassigned",
    updatedTimelog.project.id,
    project2.id,
  );
  TestValidator.equals(
    "project name should match new project",
    updatedTimelog.project.name,
    project2.name,
  );
  TestValidator.equals(
    "project status should be active",
    updatedTimelog.project.status,
    "active",
  );
  // 7. Validate other fields remain unchanged
  TestValidator.equals(
    "duration should remain unchanged",
    updatedTimelog.duration,
    originalDuration,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updatedTimelog.description,
    originalDescription,
  );
  TestValidator.equals(
    "billable should remain unchanged",
    updatedTimelog.billable,
    originalBillable,
  );
  TestValidator.equals(
    "date should remain unchanged",
    updatedTimelog.date,
    originalDate,
  );
  TestValidator.equals(
    "employee should remain unchanged",
    updatedTimelog.employee.id,
    originalTimelog.employee.id,
  );
}
