import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_project(
  input?: DeepPartial<IHrmPlatformProject.ICreate>,
): IHrmPlatformProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    color_code:
      input?.color_code ?? `#${RandomGenerator.alphabets(6).toUpperCase()}`,
    budget_hours:
      input?.budget_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<1000>
      >(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
