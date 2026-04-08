import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_timer } from "../prepare/prepare_random_hrm_time_track_timer";

/**
 * Generate a random HRM time track timer for E2E testing.
 *
 * Creates a new time tracking timer session for the authenticated employee by
 * preparing random timer data and calling the creation endpoint. The timer
 * associates with a project (required) and optionally with a task and description.
 * The system automatically records the start timestamp when the timer begins.
 *
 * Only one active timer is allowed per employee at any time. This function
 * delegates data preparation to the prepare function, ensuring valid test data
 * is generated with proper UUID formats for project_id and optional task_id.
 */
export async function generate_random_hrm_time_track_member_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackTimer.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackTimer> {
  const prepared: IHrmTimeTrackTimer.ICreate =
    prepare_random_hrm_time_track_timer(props.body);
  const result: IHrmTimeTrackTimer =
    await api.functional.hrmTimeTrack.member.timers.create(connection, {
      body: prepared,
    });
  return result;
}
