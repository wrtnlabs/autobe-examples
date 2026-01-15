import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";

export function prepare_random_todo_task(
  input?: DeepPartial<ITodoTask.ICreate> | undefined,
): ITodoTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>>(),
      }),
  };
}