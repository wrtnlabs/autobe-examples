import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_attachment_category_mapping(
  input?: DeepPartial<IDiscussionBoardAttachmentCategoryMapping.ICreate>,
): IDiscussionBoardAttachmentCategoryMapping.ICreate {
  return {
    discussion_board_attachment_id:
      input?.discussion_board_attachment_id ??
      typia.random<string & tags.Format<"uuid">>(),
    discussion_board_attachment_category_id:
      input?.discussion_board_attachment_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
