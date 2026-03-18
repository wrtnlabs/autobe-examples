import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_employee_contract } from "../prepare/prepare_random_erp_hrm_employee_contract";

export async function generate_random_erp_hrm_member_organization_members_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmEmployeeContract.ICreate> | undefined;
    params: {
      organizationMemberId: string;
    };
  },
): Promise<IErpHrmEmployeeContract> {
  const prepared: IErpHrmEmployeeContract.ICreate =
    prepare_random_erp_hrm_employee_contract(props.body);
  return await api.functional.erpHrm.member.organizationMembers.contracts.create(
    connection,
    {
      body: prepared,
      organizationMemberId: props.params.organizationMemberId,
    },
  );
}
