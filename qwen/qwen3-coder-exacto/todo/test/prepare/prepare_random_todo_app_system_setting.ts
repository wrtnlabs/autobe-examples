import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
export function prepare_random_todo_app_system_setting(
  input?: DeepPartial<ITodoAppSystemSetting.ICreate>,
): ITodoAppSystemSetting.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<75>
        >(),
      ),
    value: input?.value ?? {
      enabled: typia.random<boolean>(),
      threshold: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
      config: RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
      ),
    },
  };
}
