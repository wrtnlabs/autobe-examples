import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_employee } from "../prepare/prepare_random_erp_hrm_employee";

export async function generate_random_erp_hrm_admin_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmEmployee.ICreate>;
  },
): Promise<IErpHrmInvitation> {
  const prepared: IErpHrmEmployee.ICreate = prepare_random_erp_hrm_employee(
    props.body,
  );
  const result: IErpHrmInvitation =
    await api.functional.erpHrm.admin.employees.create(connection, {
      body: prepared,
    });
  return result;
}
