import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog project reassignment functionality.
 *
 * This test verifies that an employee can update their timelog to reassign it
 * to a different project within the same organization. The test ensures that:
 * - Project reassignment is allowed for timelog owners
 * - Employee ownership is preserved during reassignment
 * - Other timelog fields remain unchanged during partial update
 * - The updated timelog correctly references the new project
 */
export async function test_api_timelog_update_with_project_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first project (Project A) for initial timelog
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - Initial Assignment",
        status: "active",
        color_code: "#3B82F6",
      },
    },
  );
  typia.assert(projectA);
  // 3. Create second project (Project B) for reassignment
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - Reassignment Target",
        status: "active",
        color_code: "#10B981",
      },
    },
  );
  typia.assert(projectB);
  // 4. Create a timelog on Project A
  const initialTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: projectA.id,
          date: new Date().toISOString(),
          duration: 480,
          billable: true,
          description: "Initial work on Project A",
        },
      },
    );
  typia.assert(initialTimelog);
  // 5. Update timelog to reassign to Project B
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: initialTimelog.id,
      body: {
        hrm_platform_project_id: projectB.id,
      },
    });
  typia.assert(updatedTimelog);
  // 6. Validate project reassignment
  TestValidator.equals(
    "project reassigned to Project B",
    updatedTimelog.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "project name matches Project B",
    updatedTimelog.project.name,
    projectB.name,
  );
  // 7. Validate employee ownership preserved
  TestValidator.equals(
    "employee ownership preserved",
    updatedTimelog.employee.id,
    initialTimelog.employee.id,
  );
  // 8. Validate other fields unchanged
  TestValidator.equals(
    "duration unchanged",
    updatedTimelog.duration,
    initialTimelog.duration,
  );
  TestValidator.equals(
    "date unchanged",
    updatedTimelog.date,
    initialTimelog.date,
  );
  TestValidator.equals(
    "billable status unchanged",
    updatedTimelog.billable,
    initialTimelog.billable,
  );
  TestValidator.equals(
    "description unchanged",
    updatedTimelog.description,
    initialTimelog.description,
  );
}
