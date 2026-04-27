import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timer } from "../prepare/prepare_random_hrm_time_tracking_timer";

/**
 * Generate a random HRM time tracking timer for E2E testing.
 *
 * Prepares random timer creation data using the prepare function, then calls
 * the timer start endpoint to create an active timer session. The generated
 * timer is associated with the authenticated employee and a project they are
 * assigned to. Optionally a task ID and description can be provided via
 * props.body overrides.
 *
 * The created timer has status "running" with started_at set to the current
 * timestamp. An employee can have at most one active timer — ensure no other
 * timer is running before calling this function.
 *
 * @param connection The API connection configuration
 * @param props Optional partial input to override specific generated values
 * @returns The created timer entity with system-assigned fields
 */
export async function generate_random_hrm_time_tracking_member_timers_start(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimer.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingTimer> {
  const prepared: IHrmTimeTrackingTimer.ICreate = prepare_random_hrm_time_tracking_timer(
    props.body,
  );
  const result: IHrmTimeTrackingTimer = await api.functional.hrmTimeTracking.member.timers.start(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}