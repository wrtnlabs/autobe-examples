import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

/**
 * Test that updating a project member's role on a completed project is rejected with 422.
 *
 * Validates the business rule that role changes are only permitted on active projects. After setting up prerequisite entities (admin, organization, second member, employee record, project, project member), transitions the project to 'completed' status and attempts to update the member's role to 'project-lead'. The operation is expected to fail with HTTP 422 Unprocessable Entity because completed projects do not accept role modifications.
 *
 * Special attention is given to verifying that the rejection is due to the project's lifecycle status, not because of invalid membership data.
 *
 * 1. Register admin member via auth/member/join.
 * 2. Create organization — admin becomes Owner.
 * 3. Register a second member.
 * 4. Invite second member's email to create employee record.
 * 5. Create an active project.
 * 6. Add second member's employee as project member with role='member'.
 * 7. Change project status to 'completed' via member/projects/{projectId}/status.
 * 8. Attempt role update on completed project — expect 422.
 */
export async function test_api_project_member_role_update_on_completed_project(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin member
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create organization — admin becomes Owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register a second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // Step 4: Invite second member's email to create employee record
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      adminConnection,
      {
        body: {
          email: secondMember.email,
        },
      },
    );
  typia.assert(invitation);
  // Step 5: Create an active project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      adminConnection,
      {},
    );
  typia.assert(project);
  // Step 6: Add second member's employee as project member with role='member'
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      adminConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 7: Change project status to 'completed'
  const updatedProject =
    await api.functional.hrmTimeTracking.member.projects.status.update(
      adminConnection,
      {
        projectId: project.id,
        body: {
          status: "completed",
        } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  typia.assert(updatedProject);
  TestValidator.equals(
    "project status is completed",
    updatedProject.status,
    "completed",
  );
  // Step 8: Attempt role update on completed project — expect 422
  await TestValidator.httpError(
    "role update on completed project should be rejected with 422",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.projects.members.update(
        adminConnection,
        {
          projectId: project.id,
          memberId: projectMember.id,
          body: {
            role: "project-lead",
          } satisfies IHrmTimeTrackingProjectMember.IUpdate,
        },
      );
    },
  );
}
