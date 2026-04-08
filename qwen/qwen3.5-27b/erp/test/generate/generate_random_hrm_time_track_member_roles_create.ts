import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_role } from "../prepare/prepare_random_hrm_time_track_role";

/**
 * Generate a random HRM time track role via the API for E2E testing.
 *
 * Prepares random role data using the prepare function, then calls the creation endpoint.
 * The role includes a name, optional description, and list of permissions.
 * This operation requires organization owner permissions and creates a custom role
 * that is immediately available for assignment to employees.
 */
export async function generate_random_hrm_time_track_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackRole.ICreate>;
  },
): Promise<IHrmTimeTrackRole> {
  const prepared: IHrmTimeTrackRole.ICreate =
    prepare_random_hrm_time_track_role(props.body);
  const result: IHrmTimeTrackRole =
    await api.functional.hrmTimeTrack.member.roles.create(connection, {
      body: prepared,
    });
  return result;
}
