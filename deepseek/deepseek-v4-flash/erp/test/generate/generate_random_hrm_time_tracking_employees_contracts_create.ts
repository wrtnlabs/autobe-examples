import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_employee_contract } from "../prepare/prepare_random_hrm_time_tracking_employee_contract";

/**
 * Generate a random employee contract via the API for E2E testing.
 *
 * Prepares random contract creation data using the prepare function, then calls
 * the contract creation endpoint with the specified employee ID. The generated
 * contract includes randomized compensation terms such as pay rate, pay period
 * type, working hours per week, contract duration dates, and optional notes.
 *
 * @param connection The API connection configuration
 * @param props.body Optional partial contract data to override default random values
 * @param props.params.employeeId The UUID of the employee to create the contract for
 * @returns The created employee contract with all system-assigned fields
 */
export async function generate_random_hrm_time_tracking_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingEmployeeContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  }
): Promise<IHrmTimeTrackingEmployeeContract> {
  const prepared: IHrmTimeTrackingEmployeeContract.ICreate = prepare_random_hrm_time_tracking_employee_contract(
    props.body,
  );
  return await api.functional.hrmTimeTracking.employees.contracts.create(
    connection,
    {
      body: prepared,
      employeeId: props.params.employeeId,
    },
  );
}