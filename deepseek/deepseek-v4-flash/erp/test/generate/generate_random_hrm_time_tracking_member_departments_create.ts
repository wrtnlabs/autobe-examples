import api from "@ORGANIZATION/PROJECT-api";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_hrm_time_tracking_department } from "../prepare/prepare_random_hrm_time_tracking_department";

/**
 * Generate a random HRM time tracking department via the API for E2E testing.
 *
 * Prepares random department creation data using the prepare function, then
 * calls the department creation endpoint. The department is created within the
 * authenticated member's organization context, with an optional parent department
 * for hierarchy placement.
 *
 * @param connection  The API connection configuration
 * @param props       Properties containing optional creation data overrides
 * @returns           The newly created department entity
 */
export async function generate_random_hrm_time_tracking_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingDepartment.ICreate> | undefined;
  }
): Promise<IHrmTimeTrackingDepartment> {
  const prepared: IHrmTimeTrackingDepartment.ICreate = prepare_random_hrm_time_tracking_department(
    props.body
  );
  return await api.functional.hrmTimeTracking.member.departments.create(
    connection,
    {
      body: prepared,
    },
  );
}