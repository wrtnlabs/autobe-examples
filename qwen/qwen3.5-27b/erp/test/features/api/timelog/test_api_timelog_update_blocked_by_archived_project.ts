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
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Test the business rule that prevents updating a timelog when its associated project is archived or completed.
 *
 * Validates the critical constraint that timelogs can only be updated when their referenced project is in active status. This ensures time tracking accuracy and prevents modifications to work logged on finished or archived projects.
 *
 * 1. Authenticate as a member to access timelog update functionality.
 * 2. Create a timelog entry associated with an active project.
 * 3. Change the project status to archived.
 * 4. Attempt to update the timelog and verify the request is rejected because the project is no longer active.
 */
export async function test_api_timelog_update_blocked_by_archived_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a timelog entry for an active project
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  const projectId = timelog.project.id;
  // Verify the project is initially active
  TestValidator.equals(
    "project is initially active",
    timelog.project.status,
    "active",
  );
  // 3. Update the project status to archived
  const archivedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId,
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(archivedProject);
  // Verify the project is now archived
  TestValidator.equals(
    "project status is archived",
    archivedProject.status,
    "archived",
  );
  // 4. Attempt to update the timelog - should fail because project is archived
  await TestValidator.error(
    "timelog update blocked when project is archived",
    async () => {
      await api.functional.hrmTimeTrack.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            duration_seconds: timelog.duration_seconds + 3600,
          } satisfies IHrmTimeTrackTimelog.IUpdate,
        },
      );
    },
  );
}
