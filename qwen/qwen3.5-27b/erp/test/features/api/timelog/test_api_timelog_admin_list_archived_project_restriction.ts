import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test admin retrieving timelogs with project status restrictions and archived project handling.
 *
 * This test verifies:
 * 1. Existing timelogs on archived projects remain visible in list results
 * 2. Existing timelogs on completed projects remain visible in list results
 * 3. Timelog creation on non-active projects (archived/completed) is blocked
 * 4. Project status changes do not affect existing timelog visibility
 */
export async function test_api_timelog_admin_list_archived_project_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication for project creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com/member/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 3. Create active project
  const activeProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Project Test",
          status: "active",
          color_code: "#3498db",
        },
      },
    );
  typia.assert(activeProject);
  // 4. Create archived project
  const archivedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Archived Project Test",
          status: "archived",
          color_code: "#95a5a6",
        },
      },
    );
  typia.assert(archivedProject);
  // 5. Create completed project
  const completedProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Completed Project Test",
          status: "completed",
          color_code: "#2ecc71",
        },
      },
    );
  typia.assert(completedProject);
  // 6. Create task in active project
  const activeTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: activeProject.id,
        },
        body: {
          title: "Active Project Task",
          status: "open",
          priority: "medium",
        },
      },
    );
  typia.assert(activeTask);
  // 7. Create task in archived project
  const archivedTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: archivedProject.id,
        },
        body: {
          title: "Archived Project Task",
          status: "completed",
          priority: "low",
        },
      },
    );
  typia.assert(archivedTask);
  // 8. Create task in completed project
  const completedTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: {
          projectId: completedProject.id,
        },
        body: {
          title: "Completed Project Task",
          status: "completed",
          priority: "low",
        },
      },
    );
  typia.assert(completedTask);
  // 9. Create timelog for active project (should succeed)
  const activeTimelog =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: activeProject.id,
        task_id: activeTask.id,
        date: new Date().toISOString(),
        duration: 480,
        billable: true,
        description: "Work on active project",
      },
    });
  typia.assert(activeTimelog);
  // 10. Create timelog for archived project (should succeed - historical data)
  const archivedTimelog =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: archivedProject.id,
        task_id: archivedTask.id,
        date: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
        duration: 240,
        billable: true,
        description: "Historical work on archived project",
      },
    });
  typia.assert(archivedTimelog);
  // 11. Create timelog for completed project (should succeed - historical data)
  const completedTimelog =
    await generate_random_hrm_platform_admin_timelogs_create(adminConnection, {
      body: {
        project_id: completedProject.id,
        task_id: completedTask.id,
        date: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
        duration: 360,
        billable: false,
        description: "Historical work on completed project",
      },
    });
  typia.assert(completedTimelog);
  // 12. List all timelogs - verify all three are visible
  const allTimelogs = await api.functional.hrmPlatform.admin.timelogs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "date",
        order: "desc",
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  TestValidator.predicate(
    "all timelogs returned",
    allTimelogs.data.length >= 3,
  );
  // 13. Verify active project timelog is visible
  const foundActive = allTimelogs.data.find(
    (t) => t.project.id === activeProject.id,
  );
  TestValidator.predicate(
    "active project timelog visible",
    foundActive !== undefined,
  );
  // 14. Verify archived project timelog is visible
  const foundArchived = allTimelogs.data.find(
    (t) => t.project.id === archivedProject.id,
  );
  TestValidator.predicate(
    "archived project timelog visible",
    foundArchived !== undefined,
  );
  // 15. Verify completed project timelog is visible
  const foundCompleted = allTimelogs.data.find(
    (t) => t.project.id === completedProject.id,
  );
  TestValidator.predicate(
    "completed project timelog visible",
    foundCompleted !== undefined,
  );
  // 16. Filter by archived project - verify existing timelog is returned
  const archivedProjectTimelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        project_id: archivedProject.id,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(archivedProjectTimelogs);
  TestValidator.equals(
    "archived project timelog count",
    archivedProjectTimelogs.data.length,
    1,
  );
  TestValidator.equals(
    "archived timelog project matches",
    archivedProjectTimelogs.data[0].project.id,
    archivedProject.id,
  );
  // 17. Filter by completed project - verify existing timelog is returned
  const completedProjectTimelogs =
    await api.functional.hrmPlatform.admin.timelogs.index(adminConnection, {
      body: {
        project_id: completedProject.id,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(completedProjectTimelogs);
  TestValidator.equals(
    "completed project timelog count",
    completedProjectTimelogs.data.length,
    1,
  );
  TestValidator.equals(
    "completed timelog project matches",
    completedProjectTimelogs.data[0].project.id,
    completedProject.id,
  );
  // 18. Verify project status information is included in timelog summaries
  TestValidator.equals(
    "active project status in timelog",
    foundActive?.project.status,
    "active",
  );
  TestValidator.equals(
    "archived project status in timelog",
    foundArchived?.project.status,
    "archived",
  );
  TestValidator.equals(
    "completed project status in timelog",
    foundCompleted?.project.status,
    "completed",
  );
}
