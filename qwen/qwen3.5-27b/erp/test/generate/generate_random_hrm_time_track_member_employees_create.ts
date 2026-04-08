import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_employee } from "../prepare/prepare_random_hrm_time_track_employee";

/**
 * Generate a random HRM time track employee via the API for E2E testing.
 *
 * Prepares random employee creation data using the prepare function, then calls the creation endpoint.
 * The employee record establishes a person's membership and working relationship within an organization,
 * defining their position, employment type, status, and optional department and role assignments.
 */
export async function generate_random_hrm_time_track_member_employees_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackEmployee.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackEmployee> {
  const prepared: IHrmTimeTrackEmployee.ICreate =
    prepare_random_hrm_time_track_employee(props.body);
  return await api.functional.hrmTimeTrack.member.employees.create(connection, {
    body: prepared,
  });
}
