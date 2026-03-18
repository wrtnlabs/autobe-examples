import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timer } from "../prepare/prepare_random_hrm_time_tracking_timer";

export async function generate_random_hrm_time_tracking_employee_timers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimer.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingTimer> {
  const prepared: IHrmTimeTrackingTimer.ICreate =
    prepare_random_hrm_time_tracking_timer(props.body);
  const result: IHrmTimeTrackingTimer =
    await api.functional.hrmTimeTracking.employee.timers.create(connection, {
      body: prepared,
    });
  return result;
}
