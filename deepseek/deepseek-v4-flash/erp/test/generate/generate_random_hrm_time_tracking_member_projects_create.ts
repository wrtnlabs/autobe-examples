import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
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

import { prepare_random_hrm_time_tracking_project } from "../prepare/prepare_random_hrm_time_tracking_project";

/**
 * Generate a random project via the API for E2E testing.
 *
 * Prepares random project creation data using the prepare function, then calls
 * the project creation endpoint. The project is created within the authenticated
 * user's current organization context. Returns the full project entity with all
 * system-generated fields including id, status (defaulting to 'active'),
 * created_at, and updated_at.
 *
 * @param connection - The API connection object for the authenticated user
 * @param props - Properties containing optional body overrides for project data
 * @returns The newly created project with all system-generated fields
 */
export async function generate_random_hrm_time_tracking_member_projects_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingProject.ICreate> | undefined;
  }
): Promise<IHrmTimeTrackingProject> {
  const prepared: IHrmTimeTrackingProject.ICreate = prepare_random_hrm_time_tracking_project(
    props.body,
  );
  return await api.functional.hrmTimeTracking.member.projects.create(
    connection,
    {
      body: prepared,
    },
  );
}