import { IDiscussionBoardFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_flag(
  input?: DeepPartial<IDiscussionBoardFlag.ICreate> | undefined,
): IDiscussionBoardFlag.ICreate {
  input;
  return {};
}
