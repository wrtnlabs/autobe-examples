import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBudgetUtilization } from "@ORGANIZATION/PROJECT-api/lib/structures/IBudgetUtilization";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Verify that the budget utilization report correctly returns budgetHours as null and percentageConsumed as null when the project has no budget configured.
 *
 * Validates that the utilization endpoint accurately represents a project without a configured budget by creating the necessary test resources: authenticating a member, creating an employee record, creating a project without budget, assigning the employee as a project member, and creating timelogs to ensure actualHours is still calculated correctly.
 *
 * 1. Authenticate member account via join endpoint.
 * 2. Create an employee record for the authenticated member.
 * 3. Create a project without a configured budget.
 * 4. Assign the employee as a project member.
 * 5. Create timelogs for the employee against the project.
 * 6. Retrieve the budget utilization report for the project.
 * 7. Validate that budgetHours is null, percentageConsumed is null, and actualHours is greater than 0.
 */
export async function test_api_project_utilization_null_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create employee for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorizedMember.id,
        employmentType: "full-time",
      },
    },
  );
  const employeeEntity = typia.assert<IHrmPlatformEmployee>(employee);
  // 3. Create project without budget
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        budget: null,
      },
    },
  );
  const projectEntity = typia.assert<IHrmPlatformProject>(project);
  // 4. Assign employee to project
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: employeeEntity.id,
          capacityRole: "member",
        },
        params: {
          projectId: projectEntity.id,
        },
      },
    );
  typia.assert(membership);
  // 5. Create timelogs for the employee against the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectEntity.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        billable: true,
      },
    },
  );
  typia.assert<IHrmPlatformTimelog>(timelog);
  // 6. Get utilization report
  const utilization =
    await api.functional.hrmPlatform.member.projects.reports.utilization(
      memberConnection,
      {
        projectId: projectEntity.id,
      },
    );
  typia.assert<IBudgetUtilization>(utilization);
  // 7. Validate results
  TestValidator.equals(
    "projectId matches",
    utilization.projectId,
    projectEntity.id,
  );
  TestValidator.equals(
    "projectName matches",
    utilization.projectName,
    projectEntity.name,
  );
  TestValidator.equals("budgetHours is null", utilization.budgetHours, null);
  TestValidator.equals(
    "percentageConsumed is null",
    utilization.percentageConsumed,
    null,
  );
  TestValidator.predicate(
    "actualHours is positive",
    utilization.actualHours > 0,
  );
}
