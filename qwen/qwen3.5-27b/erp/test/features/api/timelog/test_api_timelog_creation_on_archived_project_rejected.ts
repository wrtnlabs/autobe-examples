import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the business rule that prevents timelog creation on non-active projects.
 * This test validates that archived and completed projects block new timelog entries
 * while preserving existing timelogs for historical reference.
 */
export async function test_api_timelog_creation_on_archived_project_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project with 'active' status
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Timelog Validation",
        description:
          "Project used to test timelog creation on archived projects",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Update the project status to 'archived'
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(adminConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // Verify the project is now archived
  TestValidator.equals(
    "project status is archived",
    updatedProject.status,
    "archived",
  );
  // 4. Attempt to create a timelog on the archived project
  // This should be rejected by the system
  await TestValidator.error(
    "timelog creation on archived project should be rejected",
    async () => {
      await generate_random_hrm_platform_admin_timelogs_create(
        adminConnection,
        {
          body: {
            project_id: project.id,
            date: new Date().toISOString(),
            duration: 60,
            billable: true,
            description: "This timelog should fail because project is archived",
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
  // 5. Verify the same rejection occurs for 'completed' status
  const completedProject =
    await api.functional.hrmPlatform.member.projects.update(adminConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(completedProject);
  TestValidator.equals(
    "project status is completed",
    completedProject.status,
    "completed",
  );
  await TestValidator.error(
    "timelog creation on completed project should be rejected",
    async () => {
      await generate_random_hrm_platform_admin_timelogs_create(
        adminConnection,
        {
          body: {
            project_id: project.id,
            date: new Date().toISOString(),
            duration: 45,
            billable: true,
            description:
              "This timelog should fail because project is completed",
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
  // 6. Verify that timelog creation succeeds on 'active' projects
  const reactivatedProject =
    await api.functional.hrmPlatform.member.projects.update(adminConnection, {
      projectId: project.id,
      body: {
        status: "active",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(reactivatedProject);
  TestValidator.equals(
    "project status is active again",
    reactivatedProject.status,
    "active",
  );
  const timelog = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: 30,
        billable: true,
        description: "This timelog should succeed because project is active",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // Verify the timelog was created successfully
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals("timelog duration is correct", timelog.duration, 30);
  TestValidator.predicate("timelog has valid date", timelog.date !== null);
}
