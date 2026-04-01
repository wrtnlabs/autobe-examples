import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_employee_contract } from "../prepare/prepare_random_hrm_platform_employee_contract";

export async function generate_random_hrm_platform_member_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformEmployeeContract.ICreate>;
    params: {
      employeeId: string;
    };
  },
): Promise<IHrmPlatformEmployeeContract> {
  const prepared: IHrmPlatformEmployeeContract.ICreate =
    prepare_random_hrm_platform_employee_contract(props.body);
  const result: IHrmPlatformEmployeeContract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      connection,
      {
        employeeId: props.params.employeeId,
        body: prepared,
      },
    );
  return result;
}
