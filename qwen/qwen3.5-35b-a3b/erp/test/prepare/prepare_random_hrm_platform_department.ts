import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform department creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformDepartment.ICreate with randomized values
 * suitable for testing department creation scenarios. The department name is
 * generated using realistic naming conventions.
 *
 * @param input Optional DeepPartial for test-time customization of properties
 * @returns Complete IHrmPlatformDepartment.ICreate with all required fields populated
 */
export function prepare_random_hrm_platform_department(
  input?: DeepPartial<IHrmPlatformDepartment.ICreate> | undefined,
): IHrmPlatformDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    parent_department_id:
      input?.parent_department_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
