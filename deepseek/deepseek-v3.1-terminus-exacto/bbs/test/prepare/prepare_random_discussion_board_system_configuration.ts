import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_configuration(
  input?: DeepPartial<IDiscussionBoardSystemConfiguration.ICreate> | undefined,
): IDiscussionBoardSystemConfiguration.ICreate {
  const data_type =
    input?.data_type ??
    RandomGenerator.pick([
      "string",
      "integer",
      "boolean",
      "json",
      "datetime",
      "uri",
    ] as const);
  // Generate value based on data_type, respecting DeepPartial input
  const value = (() => {
    if (input?.value !== undefined) {
      return input.value; // Can be string, null, or undefined
    }
    switch (data_type) {
      case "integer":
        return typia.random<number & tags.Type<"uint32">>().toString();
      case "boolean":
        return Math.random() > 0.5 ? "true" : "false";
      case "json":
        return JSON.stringify({
          test: RandomGenerator.alphabets(5),
          value: typia.random<number & tags.Type<"uint32">>(),
          active: Math.random() > 0.5,
          tags: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            () => RandomGenerator.alphabets(4),
          ),
        });
      case "datetime":
        return new Date(Date.now() + Math.random() * 1000000000).toISOString();
      case "uri":
        return (
          "https://" +
          RandomGenerator.alphabets(6).toLowerCase() +
          ".example.com/" +
          RandomGenerator.alphabets(3)
        );
      default: // 'string' and fallback
        return RandomGenerator.paragraph({ sentences: 1 });
    }
  })();
  return {
    key:
      input?.key ??
      RandomGenerator.alphabets(2).toLowerCase() +
        "." +
        RandomGenerator.alphabets(3).toLowerCase() +
        "." +
        RandomGenerator.alphabets(4).toLowerCase(),
    value: value,
    data_type: data_type,
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
