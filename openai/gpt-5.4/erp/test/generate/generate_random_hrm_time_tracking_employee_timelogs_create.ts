import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_timelog } from "../prepare/prepare_random_hrm_time_tracking_timelog";

export async function generate_random_hrm_time_tracking_employee_timelogs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTimelog.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingTimelog> {
  const prepared: IHrmTimeTrackingTimelog.ICreate =
    prepare_random_hrm_time_tracking_timelog(props.body);
  const result: IHrmTimeTrackingTimelog =
    await api.functional.hrmTimeTracking.employee.timelogs.create(connection, {
      body: prepared,
    });
  return result;
}
