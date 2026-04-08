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
 * Test that project deletion is rejected when the project has associated timelogs.
 *
 * Validates the business rule that prevents deletion of projects with existing timelog entries. This ensures data integrity by protecting historical time tracking records from being orphaned when projects are removed.
 *
 * The test authenticates as a member, creates an organization and project, adds timelog entries to the project, then attempts to delete the project. The deletion should fail with an appropriate error indicating that timelogs must be removed first.
 *
 * 1. Authenticate as a member with project management permission.
 * 2. Create an organization for the project.
 * 3. Create a project within that organization.
 * 4. Create at least one timelog entry associated with this project.
 * 5. Attempt to delete the project and verify rejection.
 * 6. Confirm the error response indicates timelogs prevent deletion.
 */
export async function test_api_project_deletion_rejected_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Create a timelog associated with the project
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(timelog);
  // 5. Attempt to delete the project and verify it is rejected
  await TestValidator.error(
    "project deletion rejected with timelogs",
    async () => {
      await api.functional.hrmTimeTrack.member.projects.erase(
        memberConnection,
        {
          projectId: project.id,
        },
      );
    },
  );
}