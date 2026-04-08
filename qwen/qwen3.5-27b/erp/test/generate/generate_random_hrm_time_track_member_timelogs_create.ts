import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_timelog } from "../prepare/prepare_random_hrm_time_track_timelog";

/**
 * Generate a random timelog entry via the API for E2E testing.
 *
 * Prepares random timelog data using the prepare function, then calls the creation endpoint.
 * The timelog records work time performed by the authenticated employee, including date,
 * duration, project assignment, optional task assignment, billable status, and notes.
 *
 * Timelogs are owned by the employee who creates them and form the foundation for
 * timesheet creation and approval workflows.
 */
export async function generate_random_hrm_time_track_member_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackTimelog.ICreate>;
  },
): Promise<IHrmTimeTrackTimelog> {
  const prepared: IHrmTimeTrackTimelog.ICreate =
    prepare_random_hrm_time_track_timelog(props.body);
  const result: IHrmTimeTrackTimelog =
    await api.functional.hrmTimeTrack.member.timelogs.create(connection, {
      body: prepared,
    });
  return result;
}
