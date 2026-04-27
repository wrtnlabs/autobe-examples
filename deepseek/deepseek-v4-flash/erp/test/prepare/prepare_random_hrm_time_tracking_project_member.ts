import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random project member creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackingProjectMember.ICreate with randomized
 * values for both properties. The employee_id is generated as a random UUID,
 * and the role is randomly selected from the available options.
 *
 * Both properties are fully customizable via the optional DeepPartial input,
 * allowing test scenarios to specify exact employee IDs or roles as needed.
 *
 * @param input - Optional partial input to override specific generated values
 * @returns A complete IHrmTimeTrackingProjectMember.ICreate with all properties set
 */
export function prepare_random_hrm_time_tracking_project_member(
  input?: DeepPartial<IHrmTimeTrackingProjectMember.ICreate>,
): IHrmTimeTrackingProjectMember.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
