import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_project(
  input?: DeepPartial<IHrmsProject.ICreate> | undefined,
): IHrmsProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    color_code: input?.color_code ?? typia.random<string>(),
    budget_hours:
      input?.budget_hours ??
      typia.random<
        number &
          tags.Type<"double"> &
          tags.ExclusiveMinimum<0> &
          tags.ExclusiveMaximum<10000>
      >(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}