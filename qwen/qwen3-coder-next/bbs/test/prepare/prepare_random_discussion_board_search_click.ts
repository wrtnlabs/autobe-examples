import { IDiscussionBoardSearchClick } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchClick";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_search_click(
  input?: DeepPartial<IDiscussionBoardSearchClick.ICreate> | undefined,
): IDiscussionBoardSearchClick.ICreate {
  input;
  return {};
}
