import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import type { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_track_role_snapshot_permission } from "../prepare/prepare_random_hrm_time_track_role_snapshot_permission";

/**
 * Generate a random HRM time track role snapshot permission via the API for E2E testing.
 *
 * Prepares random permission data using the prepare function, then calls the addPermission endpoint to add the permission to the specified role snapshot. The permission field is randomly selected from valid permission types including organization_management, employee_management, employee_viewing, project_management, project_viewing, time_management, timesheet_approval, time_viewing_all, and report_viewing.
 *
 * This function requires a snapshotId parameter to identify which role snapshot to add the permission to. The snapshot must exist and belong to an organization that the requesting user has access to.
 */
export async function generate_random_hrm_time_track_member_role_snapshots_permissions_add_permission(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackRoleSnapshotPermission.ICreate> | undefined;
    params: {
      snapshotId: string;
    };
  },
): Promise<IHrmTimeTrackRoleSnapshotPermission> {
  const prepared: IHrmTimeTrackRoleSnapshotPermission.ICreate =
    prepare_random_hrm_time_track_role_snapshot_permission(props.body);
  const result: IHrmTimeTrackRoleSnapshotPermission =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.addPermission(
      connection,
      {
        snapshotId: props.params.snapshotId,
        body: prepared,
      },
    );
  return result;
}
