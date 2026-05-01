import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test timer retrieval by the owning employee after starting a live tracking session.
 *
 * Verifies the primary success path for the timer retrieval endpoint. An employee joins the platform, creates a role with management permissions, creates their employee record, creates a project, assigns themselves as a project member, starts a running timer against the project, and then retrieves the full timer details by its ID.
 *
 * The test validates that the retrieved timer includes all expected fields: timer ID, start timestamp, associated project summary, optional task reference (null when not specified), description, and audit timestamps (created_at, updated_at). It also confirms that the employee field in the response matches the authenticated employee who owns the timer.
 *
 * 1. Member joins the platform with randomized credentials.
 * 2. Custom role is created with employee and project management permissions.
 * 3. Employee record is created linking the member to the organization with the new role.
 * 4. Active project is created for time tracking.
 * 5. Employee is assigned as a project member with the "member" role.
 * 6. Live timer is started against the project without a specific task.
 * 7. Timer is retrieved by its ID and all fields are validated for correctness.
 */
export async function test_api_timer_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role with permissions
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create employee record for the member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: member.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign the employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Start a running timer against the project
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // 7. Retrieve the timer by its ID
  const retrievedTimer = await api.functional.erpHrm.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 8. Validate retrieved timer fields
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "start timestamp matches",
    retrievedTimer.start_timestamp,
    timer.start_timestamp,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.equals(
    "task is null when not specified",
    retrievedTimer.task,
    null,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimer.description,
    timer.description,
  );
  TestValidator.equals(
    "employee ID matches the authenticated employee",
    retrievedTimer.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "created_at is a valid timestamp",
    retrievedTimer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid timestamp",
    retrievedTimer.updated_at.length > 0,
  );
}
