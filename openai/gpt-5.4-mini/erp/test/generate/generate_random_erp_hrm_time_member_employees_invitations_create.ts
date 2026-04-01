import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_employee_invitation } from "../prepare/prepare_random_erp_hrm_time_employee_invitation";

export async function generate_random_erp_hrm_time_member_employees_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeEmployeeInvitation.ICreate> | undefined;
  },
): Promise<IErpHrmTimeEmployeeInvitation> {
  const prepared: IErpHrmTimeEmployeeInvitation.ICreate =
    prepare_random_erp_hrm_time_employee_invitation(props.body);
  return await api.functional.erpHrmTime.member.employees.invitations.create(
    connection,
    {
      body: prepared,
    },
  );
}
