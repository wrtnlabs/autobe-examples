import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSchemaVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSchemaVersion";
export function prepare_random_todo_app_schema_version(
  input?: DeepPartial<ITodoAppSchemaVersion.ICreate>,
): ITodoAppSchemaVersion.ICreate {
  return {
    version:
      input?.version ??
      RandomGenerator.pick([
        "v1.0.0",
        "v1.0.1",
        "v1.1.0",
        "v2.0.0",
        "v2.1.0",
        "v2.1.1",
        "v3.0.0",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<15>
        >(),
      }),
  };
}
