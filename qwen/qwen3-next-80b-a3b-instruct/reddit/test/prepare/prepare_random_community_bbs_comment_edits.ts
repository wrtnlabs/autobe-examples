import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommentEdits } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentEdits";
export function prepare_random_community_bbs_comment_edits(
  input?: DeepPartial<ICommunityBbsCommentEdits.ICreate>,
): ICommunityBbsCommentEdits.ICreate {
  return {
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    new_content:
      input?.new_content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
    edit_reason:
      input?.edit_reason ??
      (typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1>
      >()
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
            >(),
            wordMin: 3,
            wordMax: 7,
          })
        : null),
  };
}
