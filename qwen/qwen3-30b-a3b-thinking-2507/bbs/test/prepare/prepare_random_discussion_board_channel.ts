import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
export function prepare_random_discussion_board_channel(
  input?: DeepPartial<IDiscussionBoardChannel.ICreate> | undefined,
): IDiscussionBoardChannel.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 3,
        wordMax: 5,
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        sentenceMin: 3,
        sentenceMax: 5,
        wordMin: 4,
        wordMax: 5,
      }),
    visibility:
      input?.visibility ?? RandomGenerator.pick(["public", "private"] as const),
  };
}
