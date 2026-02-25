import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_moderation_action_type(
  input?: DeepPartial<IDiscussionBoardModerationActionType.ICreate>,
): IDiscussionBoardModerationActionType.ICreate {
  return {
    code: input?.code ?? RandomGenerator.alphabets(8).toUpperCase(),
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    category:
      input?.category ??
      RandomGenerator.pick(["content", "user", "system", "security"] as const),
    severity_level:
      input?.severity_level ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    requires_reason: input?.requires_reason ?? typia.random<boolean>(),
    is_active: input?.is_active ?? true,
  };
}
