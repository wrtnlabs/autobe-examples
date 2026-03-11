import { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_metadatum(
  input?: DeepPartial<IDiscussionBoardSystemMetadatum.ICreate>,
): IDiscussionBoardSystemMetadatum.ICreate {
  const data_type =
    input?.data_type ??
    RandomGenerator.pick([
      "boolean",
      "integer",
      "string",
      "json",
      "float",
    ] as const);
  // If value is provided in input, use it regardless of data_type
  if (input?.value !== undefined) {
    return {
      name: input?.name ?? RandomGenerator.alphaNumeric(10),
      value: input.value,
      data_type: data_type,
      scope:
        input?.scope ??
        RandomGenerator.pick([
          "global",
          "production",
          "staging",
          "development",
          "tenant:*",
        ] as const),
      description:
        input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    };
  }
  // Otherwise generate value based on data_type
  let value: string;
  switch (data_type) {
    case "boolean":
      value = RandomGenerator.pick(["true", "false"] as const);
      break;
    case "integer":
      value = typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >()
        .toString();
      break;
    case "float":
      value = (Math.random() * 1000).toFixed(2);
      break;
    case "json":
      value = JSON.stringify({
        key: RandomGenerator.alphaNumeric(5),
        value: RandomGenerator.alphaNumeric(8),
      });
      break;
    case "string":
    default:
      value = RandomGenerator.alphaNumeric(12);
      break;
  }
  return {
    name: input?.name ?? RandomGenerator.alphaNumeric(10),
    value: value,
    data_type: data_type,
    scope:
      input?.scope ??
      RandomGenerator.pick([
        "global",
        "production",
        "staging",
        "development",
        "tenant:*",
      ] as const),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
