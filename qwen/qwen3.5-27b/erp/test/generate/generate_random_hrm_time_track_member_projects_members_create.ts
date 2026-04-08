import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_project_member } from "../prepare/prepare_random_hrm_time_track_project_member";

/**
 * Generate a random HRM time track project member assignment for E2E testing.
 *
 * Creates a new project member assignment by linking an employee to a project with an assigned role. This operation establishes the membership relationship that authorizes employees to access project resources, view tasks, and log time against the project.
 *
 * The assigned role (member or project-lead) determines the employee's authority level within the project context. The employee must be a valid member of the organization that owns the project, and duplicate assignments are prevented by unique constraint enforcement.
 */
export async function generate_random_hrm_time_track_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackProjectMember.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTimeTrackProjectMember> {
  const prepared: IHrmTimeTrackProjectMember.ICreate =
    prepare_random_hrm_time_track_project_member(props.body);
  return await api.functional.hrmTimeTrack.member.projects.members.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
