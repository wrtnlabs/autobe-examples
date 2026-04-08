import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_employee_contract } from "../prepare/prepare_random_hrm_platform_employee_contract";

/**
 * Generate a random HRM platform employee contract via the API for E2E testing.
 *
 * Prepares random employee contract data using the prepare function, then calls the creation endpoint.
 * The contract includes employment terms such as pay rate, pay period, working hours, and employment
 * duration. Optional fields (end_date, notes) may be null or populated with random values.
 *
 * When creating a contract for an employee with an existing active contract, the system automatically
 * ends the previous contract by setting its end_date to the day before the new contract's start_date.
 *
 * @param connection - API connection information
 * @param props - Optional configuration with body overrides
 * @param props.body - Partial contract creation data to override specific fields
 * @returns The newly created employee contract record
 */
export async function generate_random_hrm_platform_member_employee_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformEmployeeContract.ICreate>;
  },
): Promise<IHrmPlatformEmployeeContract> {
  const prepared: IHrmPlatformEmployeeContract.ICreate =
    prepare_random_hrm_platform_employee_contract(props.body);
  const result: IHrmPlatformEmployeeContract =
    await api.functional.hrmPlatform.member.employee_contracts.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
