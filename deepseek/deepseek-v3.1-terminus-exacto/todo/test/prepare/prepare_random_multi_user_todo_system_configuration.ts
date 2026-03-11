import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_system_configuration(
  input?: DeepPartial<IMultiUserTodoSystemConfiguration.ICreate> | undefined,
): IMultiUserTodoSystemConfiguration.ICreate {
  // Generate data_type first to use for config_value generation
  const data_type =
    input?.data_type ??
    RandomGenerator.pick(["string", "number", "boolean", "json"] as const);
  // Generate config_value based on data_type
  const config_value =
    input?.config_value ??
    (() => {
      switch (data_type) {
        case "string":
          return RandomGenerator.content({ paragraphs: 1 });
        case "number":
          return typia.random<number>().toString();
        case "boolean":
          return RandomGenerator.pick(["true", "false"] as const);
        case "json":
          return JSON.stringify({
            key: RandomGenerator.alphabets(8),
            value: RandomGenerator.alphabets(10),
          });
        default:
          return RandomGenerator.content({ paragraphs: 1 });
      }
    })();
  return {
    config_key: input?.config_key ?? RandomGenerator.alphabets(12),
    config_value,
    data_type,
    scope:
      input?.scope ??
      RandomGenerator.pick(["global", "component", "environment"] as const),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    is_active: input?.is_active ?? true,
  };
}
