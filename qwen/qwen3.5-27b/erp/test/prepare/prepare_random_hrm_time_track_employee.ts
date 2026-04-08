import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track employee creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackEmployee.ICreate with randomized values.
 * This DTO establishes a person's membership and working relationship within
 * an organization, defining their position, employment type, status, and
 * optional department and role assignments.
 *
 * The employment type is randomly selected from full-time, part-time,
 * contractor, or intern. Status defaults to active. Department and role
 * assignments are optional UUID references.
 */
export function prepare_random_hrm_time_track_employee(
  input?: DeepPartial<IHrmTimeTrackEmployee.ICreate>,
): IHrmTimeTrackEmployee.ICreate {
  return {
    position: input?.position ?? RandomGenerator.name(),
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    hire_date:
      input?.hire_date ?? typia.random<string & tags.Format<"date-time">>(),
    status:
      input?.status ?? RandomGenerator.pick(["active", "deactivated"] as const),
    termination_date:
      input?.termination_date ??
      typia.random<string & tags.Format<"date-time">>(),
    hrm_time_track_department_id:
      input?.hrm_time_track_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_time_track_role_id:
      input?.hrm_time_track_role_id ??
      typia.random<string & tags.Format<"uuid">>(),
    hrm_time_track_member_id:
      input?.hrm_time_track_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
