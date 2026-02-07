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
    RandomGenerator.pick(["string", "integer", "boolean", "json"] as const);
  return {
    config_key:
      input?.config_key ??
      RandomGenerator.alphabets(10) + "." + RandomGenerator.alphabets(8),
    config_value:
      input?.config_value ??
      (() => {
        const effectiveDataType = input?.data_type ?? data_type;
        switch (effectiveDataType) {
          case "boolean":
            return typia.random<boolean>() ? "true" : "false";
          case "integer":
            return typia
              .random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<0> &
                  tags.Maximum<1000>
              >()
              .toString();
          case "json":
            return JSON.stringify({
              value: RandomGenerator.alphabets(5),
              enabled: typia.random<boolean>(),
            });
          default: // string
            return RandomGenerator.alphabets(15);
        }
      })(),
    data_type: data_type,
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
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
    is_sensitive: input?.is_sensitive ?? typia.random<boolean>(),
  };
}
