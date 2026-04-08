import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_employee_contract } from "../prepare/prepare_random_hrm_time_track_employee_contract";

/**
 * Generate a random HRM time track employee contract for E2E testing.
 *
 * Creates a new employment contract for an employee with randomized compensation terms,
 * working hours, and contract period. The contract includes pay rate, pay period frequency
 * (weekly/biweekly/monthly), weekly working hours, and optional notes.
 *
 * When a new contract is created, any existing active contract for the employee is
 * automatically ended by the system. The employeeId parameter specifies which employee
 * this contract belongs to.
 */
export async function generate_random_hrm_time_track_member_employees_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackEmployeeContract.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  },
): Promise<IHrmTimeTrackEmployeeContract> {
  const prepared: IHrmTimeTrackEmployeeContract.ICreate =
    prepare_random_hrm_time_track_employee_contract(props.body);
  return await api.functional.hrmTimeTrack.member.employees.contracts.create(
    connection,
    {
      body: prepared,
      employeeId: props.params.employeeId,
    },
  );
}
