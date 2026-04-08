import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_department } from "../prepare/prepare_random_hrm_time_track_department";

/**
 * Generate a random HRM time track department for E2E testing.
 *
 * Prepares random department data using the prepare function, then calls the
 * creation endpoint to create a new department organizational unit within the
 * user's organization. The department includes a unique name, optional
 * description, and optional parent department reference for hierarchical
 * structure.
 *
 * This function creates departments that can be used for categorizing employees
 * and establishing organizational hierarchies. Department names are validated
 * for uniqueness within the same organization by the API.
 */
export async function generate_random_hrm_time_track_member_departments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackDepartment.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackDepartment> {
  const prepared: IHrmTimeTrackDepartment.ICreate =
    prepare_random_hrm_time_track_department(props.body);
  const result: IHrmTimeTrackDepartment =
    await api.functional.hrmTimeTrack.member.departments.create(connection, {
      body: prepared,
    });
  return result;
}
