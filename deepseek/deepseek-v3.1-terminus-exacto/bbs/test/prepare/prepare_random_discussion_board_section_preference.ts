import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_section_preference(
  input?: DeepPartial<IDiscussionBoardSectionPreference.ICreate> | undefined,
): IDiscussionBoardSectionPreference.ICreate {
  return {
    discussion_board_section_id:
      input?.discussion_board_section_id ??
      typia.random<string & tags.Format<"uuid">>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    notify_new_articles:
      input?.notify_new_articles ?? RandomGenerator.pick([true, false, null]),
    notify_new_comments:
      input?.notify_new_comments ?? RandomGenerator.pick([true, false, null]),
    is_hidden: input?.is_hidden ?? RandomGenerator.pick([true, false, null]),
  };
}
