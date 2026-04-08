import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_contract } from "../prepare/prepare_random_hrm_contract";

/**
 * Generate a random employment contract for an employee via the API for E2E testing.
 *
 * Prepares random contract data using the prepare function, then calls the contract creation endpoint.
 * When a new contract is created, the system automatically terminates any previously active contract
 * for the same employee by setting its end_date to one day before the new contract's start_date,
 * ensuring continuous employment history without overlapping active contracts.
 *
 * @param connection - The connection to the API server
 * @param props - Generation parameters
 * @param props.body - Optional partial contract data to override random defaults
 * @param props.params - URL parameters for the API call
 * @param props.params.employeeId - Unique identifier of the employee to whom this contract belongs
 * @returns The newly created employment contract with all system-generated fields
 */
export async function generate_random_hrm_member_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  },
): Promise<IHrmContract> {
  const prepared: IHrmContract.ICreate = prepare_random_hrm_contract(
    props.body,
  );
  const result: IHrmContract =
    await api.functional.hrm.member.employees.contracts.create(connection, {
      employeeId: props.params.employeeId,
      body: prepared,
    });
  return result;
}
