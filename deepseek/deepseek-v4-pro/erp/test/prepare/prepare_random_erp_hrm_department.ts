import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM department creation data for E2E testing.
 *
 * Generates a complete IErpHrmDepartment.ICreate with randomized values
 * suitable for creating test departments in the HRM system. The department
 * name is generated as a human-readable label using RandomGenerator.name(),
 * and the optional description and parent department reference are also
 * populated with random data.
 *
 * The parent_id, when generated, is a valid UUID that can reference an
 * existing parent department. Tests requiring a top-level department
 * without a parent can override this field in the input.
 */
export function prepare_random_erp_hrm_department(
  input?: DeepPartial<IErpHrmDepartment.ICreate>,
): IErpHrmDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
