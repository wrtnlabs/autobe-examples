import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_hrm_time_track_project } from "../prepare/prepare_random_hrm_time_track_project";

/**
 * Generate a random HRM time track project via the API for E2E testing.
 *
 * Prepares random project data using the prepare function, then calls the creation endpoint.
 * The project is automatically associated with the authenticated user's organization.
 *
 * Creates a project with randomized name, color code, description, status, budget hours,
 * and timeline dates. All fields can be customized via the input parameter for specific
 * test scenarios.
 */
export async function generate_random_hrm_time_track_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackProject.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackProject> {
  const prepared: IHrmTimeTrackProject.ICreate =
    prepare_random_hrm_time_track_project(props.body);
  const result: IHrmTimeTrackProject =
    await api.functional.hrmTimeTrack.member.projects.create(connection, {
      body: prepared,
    });
  return result;
}
