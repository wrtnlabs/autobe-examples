import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
export function prepare_random_discussion_board_channel(
  input?: DeepPartial<IDiscussionBoardChannel.ICreate>,
): IDiscussionBoardChannel.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.name(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
    isArchived: RandomGenerator.pick([true, false] as const),
    visibility: RandomGenerator.pick([
      "draft",
      "pending",
      "published",
      "hidden",
    ] as const),
    sortBy: RandomGenerator.pick([
      "created_at",
      "article_count",
      "last_activity",
    ] as const),
  };
}
