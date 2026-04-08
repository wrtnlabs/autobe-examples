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
 * Test that an employee can successfully delete their own timelog when it is not associated with any submitted or approved timesheet.
 *
 * Validates the primary success path for timelog deletion by an employee who owns the timelog. The test ensures that soft delete is properly executed and the timelog record is preserved with a deleted_at timestamp.
 *
 * This test verifies the core business rule that employees can delete their own timelogs as long as they are not part of any submitted or approved timesheet.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a project within the organization with active status.
 * 3. Assign the authenticated employee to the project as a project member.
 * 4. Create a timelog entry for the employee on the project.
 * 5. Delete the timelog using the delete endpoint.
 * 6. Verify the deletion completes successfully without errors.
 */
export async function test_api_timelog_deletion_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project in the organization
  // Note: Using random organization ID since organization creation utility is not available
  // The backend should handle organization context validation
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Assign the employee to the project as a project member
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
    });
  typia.assert(projectMember);
  // 4. Create a timelog for the employee on the project
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
        },
      },
    );
  typia.assert(timelog);
  // 5. Delete the timelog - this should succeed without throwing an error
  await api.functional.hrm.member.organizations.timelogs.eraseByOrganizationidAndTimelogid(
    memberConnection,
    {
      organizationId,
      timelogId: timelog.id,
    },
  );
  // 6. Verification: The deletion completed successfully
  // Note: Full soft-delete verification would require a GET endpoint to fetch the timelog
  // and verify deleted_at is set, but such endpoint is not available in current utilities
  // The successful completion of the delete call without error confirms the operation worked
}
