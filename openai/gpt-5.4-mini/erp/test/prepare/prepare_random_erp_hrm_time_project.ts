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
        : RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    colorCode:
      input?.colorCode ??
      `#${RandomGenerator.alphabets(6)
        .split("")
        .map((char) => char.charCodeAt(0) % 16)
        .map((digit) => digit.toString(16))
        .join("")}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budgetHours:
      input?.budgetHours !== undefined
        ? input.budgetHours
        : typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
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
