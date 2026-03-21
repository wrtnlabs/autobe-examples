import api from "@ORGANIZATION/PROJECT-api";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_erp_hrm_employee } from "../prepare/prepare_random_erp_hrm_employee";

export async function generate_random_erp_hrm_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmEmployee.ICreate>;
  }
): Promise<IErpHrmEmployee> {
  const prepared: IErpHrmEmployee.ICreate = prepare_random_erp_hrm_employee(
    props.body
  );
  const result: IErpHrmEmployee = await api.functional.erpHrm.member.employees.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}