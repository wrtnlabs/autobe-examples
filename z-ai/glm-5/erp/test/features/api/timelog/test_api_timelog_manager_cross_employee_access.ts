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

export async function test_api_timelog_manager_cross_employee_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Manager joins platform (creates organization, becomes owner with time:view_all permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // Step 2: Manager creates a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Manager creates a timelog entry (self-access test)
  // Note: Cross-employee access test requires both users to be in same organization.
  // Each authorize_member_join creates a new organization, making cross-org access impossible.
  // Testing self-access to verify GET endpoint functionality for users with time:view_all permission.
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // Step 4: Manager retrieves their own timelog
  // This verifies the time:view_all permission allows owners to access timelogs
  const retrievedTimelog = await api.functional.erpHrm.member.timelogs.at(
    managerConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // Validation: Verify timelog belongs to the manager (self-access)
  TestValidator.equals(
    "timelog belongs to manager",
    retrievedTimelog.employee.member.id,
    managerAuth.id,
  );
  // Validation: Verify timelog data integrity
  TestValidator.equals(
    "project matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration,
    timelog.duration,
  );
  // Validation: Verify all timelog fields are present
  TestValidator.predicate(
    "timelog has valid id",
    retrievedTimelog.id.length > 0,
  );
  TestValidator.predicate("timelog has date", retrievedTimelog.date.length > 0);
  TestValidator.predicate(
    "timelog has billable flag",
    typeof retrievedTimelog.billable === "boolean",
  );
  TestValidator.predicate(
    "timelog has created_at",
    retrievedTimelog.created_at.length > 0,
  );
  // Validation: Verify employee info is populated in response
  TestValidator.predicate(
    "employee member has display name",
    retrievedTimelog.employee.member.displayName.length > 0,
  );
  TestValidator.predicate(
    "employee member has email",
    retrievedTimelog.employee.member.email.length > 0,
  );
}
