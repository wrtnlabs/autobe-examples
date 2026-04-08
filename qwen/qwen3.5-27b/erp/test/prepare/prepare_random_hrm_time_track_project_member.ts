import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track project member creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackProjectMember.ICreate with randomized values.
 * The employee_id is a valid UUID, and role is randomly selected from allowed
 * values ("member" or "project-lead").
 */
export function prepare_random_hrm_time_track_project_member(
  input?: DeepPartial<IHrmTimeTrackProjectMember.ICreate> | undefined,
): IHrmTimeTrackProjectMember.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
