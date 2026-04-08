import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM project member creation data for E2E testing.
 *
 * Generates a complete IHrmProjectMember.ICreate with randomized values for testing project membership assignment functionality.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IHrmProjectMember.ICreate object with all required properties
 */
export function prepare_random_hrm_project_member(
  input?: DeepPartial<IHrmProjectMember.ICreate>,
): IHrmProjectMember.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
