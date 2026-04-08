import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_task } from "../prepare/prepare_random_hrm_time_track_task";

/**
 * Generate a random HRM time track task via the API for E2E testing.
 *
 * Prepares random task creation data using the prepare function, then calls the task creation endpoint. Tasks represent discrete units of work that can be assigned to employees, organized with parent-child hierarchy, and tracked through status transitions.
 *
 * The generated task includes project assignment, optional employee assignee, parent task reference, title, description, priority, status, and effort estimates. All values are randomized unless overridden by the input parameter.
 */
export async function generate_random_hrm_time_track_member_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackTask.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackTask> {
  const prepared: IHrmTimeTrackTask.ICreate =
    prepare_random_hrm_time_track_task(props.body);
  const result: IHrmTimeTrackTask =
    await api.functional.hrmTimeTrack.member.tasks.create(connection, {
      body: prepared,
    });
  return result;
}
