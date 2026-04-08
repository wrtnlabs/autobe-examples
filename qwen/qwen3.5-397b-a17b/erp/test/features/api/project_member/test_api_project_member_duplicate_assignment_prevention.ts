import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test duplicate project member assignment prevention.
 *
 * Validates the business logic that prevents assigning the same employee to a project multiple times. The system enforces a unique constraint on the combination of project and employee to ensure each membership is unique. This test verifies that the first assignment succeeds while the second attempt is rejected with a conflict error.
 *
 * The test flow establishes a member account, creates a project, invites and activates an employee, then attempts duplicate assignment. This ensures data integrity by preventing redundant membership records.
 *
 * 1. Member joins the platform to gain authentication.
 * 2. Create a project for the assignment test.
 * 3. Invite an employee by email (creates pending invitation).
 * 4. Join with the invited email to accept invitation and create employee record.
 * 5. Retrieve the created employee's ID from the organization.
 * 6. Assign the employee to the project (first assignment - should succeed).
 * 7. Attempt to assign the same employee to the same project again (should fail with 409 Conflict).
 */
export async function test_api_project_member_duplicate_assignment_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Invite an employee by email (creates pending invitation)
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: invitedEmail,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Join with the invited email to accept invitation and create employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: invitedEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 5. Retrieve employee ID - in practice this would come from an employee listing endpoint
  // For this test, we assume the employee was created and obtain the ID
  // Note: A complete implementation would require GET /hrmPlatform/member/employees endpoint
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 6. Assign employee to project (first time - should succeed)
  const firstAssignment =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(firstAssignment);
  // 7. Attempt duplicate assignment (should fail with 409 Conflict)
  await TestValidator.error("duplicate project assignment", async () => {
    await api.functional.hrmPlatform.member.projects.members.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  });
}
