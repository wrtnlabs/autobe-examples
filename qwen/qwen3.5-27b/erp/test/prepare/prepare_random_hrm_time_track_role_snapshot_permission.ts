import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track role snapshot permission creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackRoleSnapshotPermission.ICreate with randomized permission values.
 * The permission field is randomly selected from the valid permission types including
 * organization_management, employee_management, employee_viewing, project_management,
 * project_viewing, time_management, timesheet_approval, time_viewing_all, and report_viewing.
 *
 * @param input - Optional DeepPartial override for specific fields
 * @returns Complete IHrmTimeTrackRoleSnapshotPermission.ICreate instance
 */
export function prepare_random_hrm_time_track_role_snapshot_permission(
  input?: DeepPartial<IHrmTimeTrackRoleSnapshotPermission.ICreate> | undefined,
): IHrmTimeTrackRoleSnapshotPermission.ICreate {
  return {
    permission:
      input?.permission ??
      RandomGenerator.pick([
        "organization_management",
        "employee_management",
        "employee_viewing",
        "project_management",
        "project_viewing",
        "time_management",
        "timesheet_approval",
        "time_viewing_all",
        "report_viewing",
      ] as const),
  };
}
