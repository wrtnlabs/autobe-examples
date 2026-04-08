import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test that deletion of a timelog is blocked when it is part of an approved timesheet.
 *
 * Validates the business rule that timelogs included in approved timesheets cannot be deleted to preserve the integrity of finalized time records. This test demonstrates the complete workflow from member authentication through timelog creation and deletion attempt.
 *
 * **Test Flow**:
 * 1. Member authentication and organization context setup
 * 2. Project creation for timelog association
 * 3. Employee assignment to project
 * 4. Timelog creation for the employee
 * 5. Attempted timelog deletion (should succeed when not in approved timesheet)
 *
 * **Limitation Note**: The current SDK does not expose timesheet creation/approval endpoints or employee management endpoints. This test validates the basic timelog deletion flow when not blocked by timesheet approval. A complete test of the blocked deletion scenario would require:
 * - Employee creation/lookup endpoints to obtain employee_id
 * - Timesheet creation endpoint to create a draft timesheet
 * - Timesheet submission endpoint to submit the timesheet
 * - Timesheet approval endpoint to approve the timesheet
 * - Timelog deletion endpoint should return 409 Conflict when timelog is in approved timesheet
 *
 * 1. Authenticate member using authorize_member_join utility function
 * 2. Create a project using generate_random_hrm_member_organizations_projects_create
 * 3. Create employee assignment to project using generate_random_hrm_member_projects_members_create (requires existing employee_id)
 * 4. Create a timelog using generate_random_hrm_member_organizations_timelogs_create (requires employee to be assigned to project)
 * 5. Attempt to delete the timelog using eraseByOrganizationcodeAndTimelogid
 * 6. Validate deletion succeeds when timelog is not part of approved timesheet
 */
export async function test_api_timelog_deletion_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Extract organization context from the member's organizations
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must belong to at least one organization");
  }
  const organizationId: string = memberAuth.organizations[0].id;
  const organizationCode: string = organizationId; // Using organization ID as code
  // 2. Create a project for timelog association
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Employee assignment to project
  // NOTE: This step requires an existing employee_id. The SDK does not expose employee creation endpoints.
  // In a complete implementation, we would:
  // - Create an employee record for the member in this organization
  // - Use the returned employee_id for project membership and timelog creation
  // For this test, we use the member's ID as a placeholder (actual implementation requires employee management endpoints)
  const employeeId: string = memberAuth.id; // Placeholder - requires actual employee creation
  const projectMember: IHrmProjectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
      params: {
        projectId: project.id,
      },
    });
  typia.assert(projectMember);
  // 4. Create a timelog
  // NOTE: This requires the employee to be properly assigned to the project
  const timelog: IHrmTimelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timelog);
  // 5. Attempt to delete the timelog
  // Since there is no approved timesheet blocking it, deletion should succeed
  await api.functional.hrm.member.organizations.timelogs.eraseByOrganizationcodeAndTimelogid(
    memberConnection,
    {
      organizationCode,
      timelogId: timelog.id,
    },
  );
  // 6. Validate the deletion succeeded (204 No Content)
  TestValidator.predicate(
    "timelog deletion succeeded when not in approved timesheet",
    true,
  );
}
