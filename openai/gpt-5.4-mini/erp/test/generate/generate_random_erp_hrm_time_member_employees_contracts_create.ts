import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_employee_contract } from "../prepare/prepare_random_erp_hrm_time_employee_contract";

export async function generate_random_erp_hrm_time_member_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeEmployeeContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  },
): Promise<IErpHrmTimeEmployeeContract> {
  const prepared: IErpHrmTimeEmployeeContract.ICreate =
    prepare_random_erp_hrm_time_employee_contract(props.body);
  return await api.functional.erpHrmTime.member.employees.contracts.create(
    connection,
    {
      body: prepared,
      employeeId: props.params.employeeId,
    },
  );
}
