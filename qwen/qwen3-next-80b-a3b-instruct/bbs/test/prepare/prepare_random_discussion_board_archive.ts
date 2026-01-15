import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArchive";
export function prepare_random_discussion_board_archive(
  input?: DeepPartial<IDiscussionBoardArchive.ICreate>,
): IDiscussionBoardArchive.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        sentenceMin: 8,
        sentenceMax: 15,
      }),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
        >(),
        wordMin: 4,
        wordMax: 10,
      }),
    source_content_id:
      input?.source_content_id ?? typia.random<string & tags.Format<"uuid">>(),
    source_type:
      input?.source_type ??
      RandomGenerator.pick(["article", "comment", "attachment"] as const),
  };
}
