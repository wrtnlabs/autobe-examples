import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_project_member } from "../prepare/prepare_random_hrm_time_tracking_project_member";

/**
 * Generate a random project member for E2E testing.
 *
 * Creates a project member linked to the specified project by preparing
 * random project member data (employee_id and role) via the prepare function,
 * then calling the POST endpoint to create the actual resource.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial input to override specific generated values
 * @param props.params.projectId - UUID of the project to add the member to
 * @returns The created project membership record including the assigned role and timestamps
 */
export async function generate_random_hrm_time_tracking_member_projects_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingProjectMember.ICreate>;
    params: {
      projectId: string;
    };
  }
): Promise<IHrmTimeTrackingProjectMember> {
  const prepared: IHrmTimeTrackingProjectMember.ICreate = prepare_random_hrm_time_tracking_project_member(
    props.body
  );
  const result: IHrmTimeTrackingProjectMember = await api.functional.hrmTimeTracking.member.projects.members.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
  return result;
}