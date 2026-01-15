import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
export function prepare_random_discussion_board_report(
  input?: DeepPartial<IDiscussionBoardReport.ICreate>,
): IDiscussionBoardReport.ICreate {
  return {
    target_content_type:
      input?.target_content_type ??
      RandomGenerator.pick(["article", "comment"] as const),
    report_type:
      input?.report_type ??
      RandomGenerator.pick([
        "spam",
        "harassment",
        "hate_speech",
        "violence",
        "illegal",
        "inappropriate",
        "impersonation",
        "copyright",
        "other",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 10,
      }),
  };
}
