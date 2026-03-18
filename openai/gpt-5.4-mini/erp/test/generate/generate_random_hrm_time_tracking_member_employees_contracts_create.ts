import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_employee_contract } from "../prepare/prepare_random_hrm_time_tracking_employee_contract";

export async function generate_random_hrm_time_tracking_member_employees_contracts_create(
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
  return await api.functional.hrmTimeTracking.member.employees.contracts.create(
    connection,
    {
      body: prepared,
      employeeId: props.params.employeeId,
    },
  );
}
