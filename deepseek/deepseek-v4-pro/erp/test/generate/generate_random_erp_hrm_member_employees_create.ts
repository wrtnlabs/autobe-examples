import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_employee } from "../prepare/prepare_random_erp_hrm_employee";

/**
 * Generate a random ERP HRM employee for E2E testing via the invitation endpoint.
 *
 * Prepares random employee invitation data using the prepare function, then calls the employee creation endpoint.
 * When the invited email matches an existing user account, the employee is created immediately with active status.
 * When the email does not match any existing user, a pending invitation is created instead.
 *
 * The returned employee record includes the member profile, assigned role, department placement (if any),
 * position title, employment type, and status. All properties support DeepPartial override via the
 * optional `body` input parameter, allowing tests to customize specific fields while keeping others random.
 */
export async function generate_random_erp_hrm_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmEmployee.ICreate> | undefined;
  },
): Promise<IErpHrmEmployee> {
  const prepared: IErpHrmEmployee.ICreate = prepare_random_erp_hrm_employee(
    props.body,
  );
  return await api.functional.erpHrm.member.employees.create(connection, {
    body: prepared,
  });
}
