import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_employee_snapshot } from "../prepare/prepare_random_hrm_time_tracking_employee_snapshot";

/**
 * Generate a random employee snapshot via the API for E2E testing.
 *
 * Prepares random employee snapshot data using the prepare function, then calls
 * the creation endpoint to create a manual audit checkpoint that captures the
 * employee's current record state at a specific moment. The snapshot records
 * which field changed and optional before/after values.
 *
 * Requires employee:manage permission. The requesting user is recorded as
 * the actor who created the snapshot.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial data to override specific fields in the snapshot
 * @param props.params.employeeId - UUID of the employee to create a snapshot for
 * @returns The created employee snapshot record
 */
export async function generate_random_hrm_time_tracking_employees_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingEmployeeSnapshot.ICreate> | undefined;
    params: {
      employeeId: string;
    };
  }
): Promise<IHrmTimeTrackingEmployeeSnapshot> {
  const prepared: IHrmTimeTrackingEmployeeSnapshot.ICreate = prepare_random_hrm_time_tracking_employee_snapshot(
    props.body
  );
  return await api.functional.hrmTimeTracking.employees.snapshots.create(
    connection,
    {
      body: prepared,
      employeeId: props.params.employeeId,
    },
  );
}
