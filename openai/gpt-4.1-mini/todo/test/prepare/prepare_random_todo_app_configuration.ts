import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
export function prepare_random_todo_app_configuration(
  input?: DeepPartial<ITodoAppConfiguration.ICreate>,
): ITodoAppConfiguration.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
        >(),
      ),
    value:
      input?.value ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      }),
    description:
      input?.description !== undefined
        ? input.description === null
          ? null
          : input.description
        : RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
            >(),
          }),
    type:
      input?.type ??
      RandomGenerator.pick(["boolean", "string", "number"] as const),
  };
}
