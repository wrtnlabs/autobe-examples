import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform department creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformDepartment.ICreate with randomized values for
 * department name, optional description, and optional parent department reference.
 * All properties support test-time customization through the DeepPartial input
 * parameter.
 *
 * The function handles optional properties (description, parentDepartmentId) by
 * preserving explicit null values from input while generating random defaults
 * when undefined. The name property always receives a value, either from input
 * or generated using RandomGenerator.name() for realistic department names.
 */
export function prepare_random_hrm_platform_department(
  input?: DeepPartial<IHrmPlatformDepartment.ICreate>,
): IHrmPlatformDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    parentDepartmentId:
      input?.parentDepartmentId !== undefined
        ? input.parentDepartmentId
        : typia.random<string & tags.Format<"uuid">>(),
  };
}
