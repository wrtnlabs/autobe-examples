import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform employee creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformEmployee.ICreate with randomized values
 * for employee invitation including department assignment, employment type,
 * member identification, position title, and role assignment.
 *
 * All properties support test-time customization through DeepPartial input,
 * allowing selective override of specific fields while maintaining realistic
 * generated data for comprehensive testing scenarios.
 */
export function prepare_random_hrm_platform_employee(
  input?: DeepPartial<IHrmPlatformEmployee.ICreate>,
): IHrmPlatformEmployee.ICreate {
  return {
    departmentId:
      input?.departmentId ?? typia.random<string & tags.Format<"uuid">>(),
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    position: input?.position ?? RandomGenerator.paragraph({ sentences: 1 }),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
