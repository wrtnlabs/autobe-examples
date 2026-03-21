import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_project(
  input?: DeepPartial<IErpHrmProject.ICreate>,
): IErpHrmProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({ paragraphs: 2 }),
    color_code:
      input?.color_code ??
      typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
    budget_hours:
      input?.budget_hours !== undefined
        ? input.budget_hours
        : typia.random<number & tags.Minimum<0> & tags.Type<"double">>(),
    start_date:
      input?.start_date !== undefined
        ? input.start_date
        : typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date !== undefined
        ? input.end_date
        : typia.random<string & tags.Format<"date-time">>(),
  };
}