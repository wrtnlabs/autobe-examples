import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_employee } from "../prepare/prepare_random_hrm_time_tracking_employee";

export async function generate_random_hrm_time_tracking_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingEmployee.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingEmployee> {
  const prepared: IHrmTimeTrackingEmployee.ICreate =
    prepare_random_hrm_time_tracking_employee(props.body);
  return await api.functional.hrmTimeTracking.member.employees.create(
    connection,
    {
      body: prepared,
    },
  );
}
