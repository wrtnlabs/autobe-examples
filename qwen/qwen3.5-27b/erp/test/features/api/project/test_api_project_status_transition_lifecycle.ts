import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";

/**
 * Test project status transitions through the lifecycle states (active, archived, completed).
 *
 * Validates that projects can transition between all lifecycle status states bidirectionally. The test verifies that status changes are properly persisted, timestamps are updated correctly, and other project attributes remain unchanged during transitions.
 *
 * Special attention is given to ensuring that projects can be reactivated from archived or completed states, demonstrating the flexibility of the project lifecycle management system.
 *
 * 1. Register and authenticate as a member with project management permissions
 * 2. Create an organization to serve as the project context
 * 3. Create a project with initial status 'active'
 * 4. Verify the initial project status is 'active'
 * 5. Update project status to 'archived' and verify the change
 * 6. Update project status to 'completed' and verify the change
 * 7. Update project status back to 'active' and verify reactivation
 * 8. Validate that updated_at timestamp changes with each status transition
 */
export async function test_api_project_status_transition_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project with initial status 'active'
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Verify initial project status is 'active'
  TestValidator.equals("initial status is active", project.status, "active");
  // Store initial updated_at timestamp
  const initialUpdatedAt = project.updated_at;
  // 5. Update project status to 'archived'
  const archivedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(archivedProject);
  // 6. Verify status changed to 'archived'
  TestValidator.equals(
    "status changed to archived",
    archivedProject.status,
    "archived",
  );
  TestValidator.predicate(
    "updated_at changed after archive",
    archivedProject.updated_at !== initialUpdatedAt,
  );
  // Store archived updated_at timestamp
  const archivedUpdatedAt = archivedProject.updated_at;
  // 7. Update project status to 'completed'
  const completedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(completedProject);
  // 8. Verify status changed to 'completed'
  TestValidator.equals(
    "status changed to completed",
    completedProject.status,
    "completed",
  );
  TestValidator.predicate(
    "updated_at changed after complete",
    completedProject.updated_at !== archivedUpdatedAt,
  );
  // Store completed updated_at timestamp
  const completedUpdatedAt = completedProject.updated_at;
  // 9. Update project status back to 'active' (reactivation)
  const reactivatedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "active",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(reactivatedProject);
  // 10. Verify status changed back to 'active'
  TestValidator.equals(
    "status reactivated to active",
    reactivatedProject.status,
    "active",
  );
  TestValidator.predicate(
    "updated_at changed after reactivation",
    reactivatedProject.updated_at !== completedUpdatedAt,
  );
  // 11. Verify other project attributes remain unchanged
  TestValidator.equals(
    "project name unchanged",
    reactivatedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color_code unchanged",
    reactivatedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project description unchanged",
    reactivatedProject.description,
    project.description,
  );
}
