import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_administrator_promotion_approval(
  input?: DeepPartial<IDiscussionBoardAdministratorPromotionApproval.ICreate>,
): IDiscussionBoardAdministratorPromotionApproval.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.content({
        sentenceMin: 8,
        sentenceMax: 25,
        wordMin: 5,
        wordMax: 12,
      }),
  };
}
