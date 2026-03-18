import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_department } from "../prepare/prepare_random_hrm_time_tracking_department";

export async function generate_random_hrm_time_tracking_manager_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingDepartment.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingDepartment> {
  const prepared: IHrmTimeTrackingDepartment.ICreate =
    prepare_random_hrm_time_tracking_department(props.body);
  const result: IHrmTimeTrackingDepartment =
    await api.functional.hrmTimeTracking.manager.departments.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
