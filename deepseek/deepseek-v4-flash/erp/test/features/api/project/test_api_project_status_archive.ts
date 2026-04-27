import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

/**
 * Test archiving an active project by updating its status from 'active' to 'archived'.
 *
 * Validates the project lifecycle status transition from active to archived via the project update endpoint. Ensures that the archived project retains all original metadata (name, color_code) while reflecting the new status and an updated timestamp.
 *
 * After archiving, attempts to transition back to 'active' and verifies that the project lifecycle rules prevent this — per specification, archived/completed projects cannot transition back to active status.
 *
 * 1. Member registers via `authorize_member_join`.
 * 2. Organization created via `generate_random_hrm_time_tracking_member_organizations_create`.
 * 3. Active project created via `generate_random_hrm_time_tracking_member_projects_create`.
 * 4. Project updated with status='archived' via `api.functional.hrmTimeTracking.member.projects.update`.
 * 5. Response validated: status is 'archived', original fields preserved, updated_at changed.
 * 6. Attempt status='active' update — verifies status remains 'archived' per lifecycle rules.
 */
export async function test_api_project_status_archive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization (required context for project creation)
  await generate_random_hrm_time_tracking_member_organizations_create(
    memberConnection,
    {},
  );
  // 3. Create an active project with specific name and color_code
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: "Active Project",
          color_code: "#E74C3C",
        },
      },
    );
  typia.assert(project);
  TestValidator.equals("initial status is active", project.status, "active");
  const originalUpdatedAt = project.updated_at;
  // 4. Archive the project
  const archivedProject =
    await api.functional.hrmTimeTracking.member.projects.update(
      memberConnection,
      {
        projectId: project.id,
        body: { status: "archived" } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  typia.assert(archivedProject);
  // 5. Validate archived project
  TestValidator.equals(
    "status changed to archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.equals("name unchanged", archivedProject.name, project.name);
  TestValidator.equals(
    "color_code unchanged",
    archivedProject.color_code,
    project.color_code,
  );
  TestValidator.notEquals(
    "updated_at updated",
    archivedProject.updated_at,
    originalUpdatedAt,
  );
  // 6. Attempt to transition back to 'active' — must remain 'archived' per lifecycle rules
  const revertedProject =
    await api.functional.hrmTimeTracking.member.projects.update(
      memberConnection,
      {
        projectId: project.id,
        body: { status: "active" } satisfies IHrmTimeTrackingProject.IUpdate,
      },
    );
  typia.assert(revertedProject);
  TestValidator.equals(
    "status remains archived after attempted revert to active",
    revertedProject.status,
    "archived",
  );
}
