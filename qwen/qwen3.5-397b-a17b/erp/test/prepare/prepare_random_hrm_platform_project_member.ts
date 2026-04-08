import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform project member creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformProjectMember.ICreate with randomized values
 * for assigning an employee to a project. The employee ID is generated as a
 * valid UUID, and the role is randomly selected from the available options
 * ('member' or 'project-lead').
 *
 * All properties support input override via DeepPartial, allowing tests to
 * customize specific fields while using random defaults for others.
 */
export function prepare_random_hrm_platform_project_member(
  input?: DeepPartial<IHrmPlatformProjectMember.ICreate>,
): IHrmPlatformProjectMember.ICreate {
  return {
    hrm_platform_employee_id:
      input?.hrm_platform_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project-lead"] as const),
  };
}
