import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_configuration(
  input?: DeepPartial<IDiscussionBoardSystemConfiguration.ICreate>,
): IDiscussionBoardSystemConfiguration.ICreate {
  const data_type =
    input?.data_type ??
    RandomGenerator.pick([
      "string",
      "integer",
      "boolean",
      "number",
      "json",
    ] as const);
  const generateConfigValue = () => {
    switch (data_type) {
      case "string":
        return RandomGenerator.paragraph({ sentences: 1 });
      case "integer":
        return typia.random<number & tags.Type<"int32">>().toString();
      case "boolean":
        return RandomGenerator.pick(["true", "false"] as const);
      case "number":
        return typia.random<number & tags.Type<"double">>().toString();
      case "json":
        return JSON.stringify({
          value: RandomGenerator.alphabets(5),
          enabled: RandomGenerator.pick([true, false] as const),
        });
      default:
        return "default";
    }
  };
  return {
    config_key: input?.config_key ?? RandomGenerator.alphabets(10),
    config_value: input?.config_value ?? generateConfigValue(),
    data_type: data_type,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    category:
      input?.category ??
      RandomGenerator.pick([
        "authentication",
        "content",
        "performance",
        "security",
        "ui",
        "api",
      ] as const),
    is_sensitive: input?.is_sensitive ?? false,
  };
}
