import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_moderation_action_type(
  input?: DeepPartial<IDiscussionBoardModerationActionType.ICreate>,
): IDiscussionBoardModerationActionType.ICreate {
  const categoryOptions = ["user", "content", "system", "spam"] as const;
  const severityOptions = ["low", "medium", "high", "critical"] as const;
  const codeOptions = [
    "ban_user",
    "delete_comment",
    "remove_article",
    "warn_user",
    "suspend_user",
    "approve_admin",
  ] as const;
  return {
    code: input?.code ?? RandomGenerator.pick(codeOptions),
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 1, wordMax: 3 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    category:
      input?.category ??
      (typia.random<number>() > 0.5
        ? RandomGenerator.pick(categoryOptions)
        : null),
    severity_level:
      input?.severity_level ??
      (typia.random<number>() > 0.5
        ? RandomGenerator.pick(severityOptions)
        : null),
    requires_reason: input?.requires_reason ?? typia.random<boolean>(),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
