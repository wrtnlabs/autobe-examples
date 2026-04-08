import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random project membership data for HRM platform E2E testing.
 *
 * Generates a complete IHrmPlatformProjectMembership.ICreate with randomized employee
 * assignment and role configuration. The employee_id is generated as a UUID format
 * string, while role is randomly selected from available options (member or project_lead).
 */
export function prepare_random_hrm_platform_project_membership(
  input?: DeepPartial<IHrmPlatformProjectMembership.ICreate>,
): IHrmPlatformProjectMembership.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    role:
      input?.role ?? RandomGenerator.pick(["member", "project_lead"] as const),
  };
}
