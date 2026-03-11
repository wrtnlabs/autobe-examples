import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_attachment_category(
  input?: DeepPartial<IDiscussionBoardAttachmentCategory.ICreate> | undefined,
): IDiscussionBoardAttachmentCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 3 }),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          })
        : null),
    parent_id:
      input?.parent_id ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    order_index:
      input?.order_index ?? typia.random<number & tags.Type<"int32">>(),
    is_active: input?.is_active ?? Math.random() > 0.5,
  };
}
