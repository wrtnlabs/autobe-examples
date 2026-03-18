import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_employee_contract } from "../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function generate_random_hrm_time_tracking_owner_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingEmployeeContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  },
): Promise<IHrmTimeTrackingEmployeeContract> {
  const prepared: IHrmTimeTrackingEmployeeContract.ICreate =
    prepare_random_hrm_time_tracking_employee_contract(props.body);
  const result: IHrmTimeTrackingEmployeeContract =
    await api.functional.hrmTimeTracking.owner.employees.contracts.create(
      connection,
      {
        body: prepared,
        employeeId: props.params.employeeId,
      },
    );
  return result;
}
