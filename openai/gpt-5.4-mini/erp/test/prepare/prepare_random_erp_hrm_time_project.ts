import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_project(
  input?: DeepPartial<IErpHrmTimeProject.ICreate> | undefined,
): IErpHrmTimeProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    colorCode:
      input?.colorCode ??
      `#${RandomGenerator.alphabets(6).replace(/[^a-f]/g, "a")}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budgetHours:
      input?.budgetHours !== undefined
        ? input.budgetHours
        : typia.random<number & tags.Type<"double"> & tags.Minimum<0>>(),
    startDate:
      input?.startDate !== undefined
        ? input.startDate
        : typia.random<string & tags.Format<"date-time">>(),
    endDate:
      input?.endDate !== undefined
        ? input.endDate
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
