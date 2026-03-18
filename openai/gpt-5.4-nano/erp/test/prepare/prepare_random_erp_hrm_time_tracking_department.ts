import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_department(
  input?: DeepPartial<IErpHrmTimeTrackingDepartment.ICreate> | undefined,
): IErpHrmTimeTrackingDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description !== undefined
        ? input.description
        : Math.random() < 0.5
          ? null
          : RandomGenerator.paragraph({ sentences: 2 }),
    parent_department_id:
      input?.parent_department_id !== undefined
        ? input.parent_department_id
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"uuid">>(),
  };
}
