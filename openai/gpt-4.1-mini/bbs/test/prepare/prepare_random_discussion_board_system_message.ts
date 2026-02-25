import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_message(
  input?: DeepPartial<IDiscussionBoardSystemMessage.ICreate>,
): IDiscussionBoardSystemMessage.ICreate {
  return {
    code: input?.code ?? RandomGenerator.alphabets(12),
    messageText:
      input?.messageText ?? RandomGenerator.paragraph({ sentences: 3 }),
    messageType: input?.messageType ?? RandomGenerator.alphabets(10),
  };
}
