import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_contract } from "../prepare/prepare_random_erp_hrm_contract";

/**
 * Generate a random ERP HRM employment contract via the API for E2E testing.
 *
 * Prepares random contract data using the prepare function, then calls the contract
 * creation endpoint for the specified employee. The contract includes randomized
 * compensation terms such as pay rate, pay period, working hours per week, and
 * effective date range. The employee is identified by the `employeeId` path parameter
 * and must belong to the current organization context.
 *
 * When a new contract is created, the system automatically closes the employee's
 * previous active contract by setting its end date to the day before the new
 * contract's start date, ensuring only one contract is active at any given time
 * while preserving all past contracts as immutable historical records.
 *
 * Access to this endpoint requires the `employee:manage` permission.
 */
export async function generate_random_erp_hrm_member_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  },
): Promise<IErpHrmContract> {
  const prepared: IErpHrmContract.ICreate = prepare_random_erp_hrm_contract(
    props.body,
  );
  const result: IErpHrmContract =
    await api.functional.erpHrm.member.employees.contracts.create(connection, {
      employeeId: props.params.employeeId,
      body: prepared,
    });
  return result;
}
