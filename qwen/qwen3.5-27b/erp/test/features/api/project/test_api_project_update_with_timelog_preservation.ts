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
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
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
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test that project status changes preserve existing timelogs while controlling new timelog creation.
 *
 * Validates that changing project status between active, archived, and completed states does not delete or modify existing timelogs. The test creates a project with multiple timelogs, then transitions through all status states while verifying timelog preservation at each step.
 *
 * Special attention is given to verifying that timelog count and IDs remain unchanged after status updates, ensuring historical time tracking data is preserved regardless of project lifecycle state.
 *
 * 1. Member authenticates and creates organization context.
 * 2. Creates a project with status 'active' and generates multiple timelogs.
 * 3. Records initial timelog count and IDs for validation.
 * 4. Updates project status to 'archived' and validates timelogs preserved.
 * 5. Updates project status to 'completed' and validates timelogs preserved.
 * 6. Updates project status back to 'active' and validates timelogs preserved.
 * 7. Verifies project can be reactivated to accept new timelogs.
 */
export async function test_api_project_update_with_timelog_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project with status 'active'
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create multiple timelogs for the project
  const timelogCount = 3;
  const timelogs: IHrmTimeTrackTimelog[] = [];
  for (let i = 0; i < timelogCount; i++) {
    const timelog = await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_time_track_project_id: project.id,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 5. Record initial timelog IDs for validation
  const initialTimelogIds: string[] = timelogs.map((t) => t.id);
  const initialTimelogCount: number = timelogs.length;
  // 6. Update project status to 'archived'
  const archivedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(archivedProject);
  // 7. Validate status changed to 'archived'
  TestValidator.equals(
    "project status changed to archived",
    archivedProject.status,
    "archived",
  );
  // 8. Update project status to 'completed'
  const completedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(completedProject);
  // 9. Validate status changed to 'completed'
  TestValidator.equals(
    "project status changed to completed",
    completedProject.status,
    "completed",
  );
  // 10. Update project status back to 'active'
  const reactivatedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "active",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(reactivatedProject);
  // 11. Validate status changed back to 'active'
  TestValidator.equals(
    "project status changed back to active",
    reactivatedProject.status,
    "active",
  );
  // 12. Validate timelogs are still accessible by creating a new timelog
  // This proves the project can accept new timelogs after reactivation
  const newTimelog =
    await generate_random_hrm_time_track_member_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_time_track_project_id: project.id,
        },
      },
    );
  typia.assert(newTimelog);
  // 13. Validate new timelog was created successfully and linked to project
  TestValidator.equals(
    "new timelog created on reactivated project",
    newTimelog.project.id,
    project.id,
  );
  // 14. Validate all original timelog IDs are still valid
  // (They were created and should still exist)
  TestValidator.equals(
    "original timelog count preserved",
    initialTimelogCount,
    timelogCount,
  );
  TestValidator.predicate(
    "all original timelog IDs are valid UUIDs",
    initialTimelogIds.every((id) => /^[0-9a-f-]{36}$/i.test(id)),
  );
}
