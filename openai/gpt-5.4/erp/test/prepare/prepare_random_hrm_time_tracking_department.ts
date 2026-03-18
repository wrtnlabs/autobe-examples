import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_department(
  input?: DeepPartial<IHrmTimeTrackingDepartment.ICreate>,
): IHrmTimeTrackingDepartment.ICreate {
  return {
    name:
      input?.name ??
      `${RandomGenerator.pick(["Engineering", "Product", "Design", "Finance", "People", "Operations", "Support", "Sales", "Marketing"] as const)} ${RandomGenerator.pick(["Team", "Department", "Office", "Division"] as const)}`,
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 3 }),
    parent_department_id:
      input?.parent_department_id !== undefined
        ? input.parent_department_id
        : undefined,
  };
}
