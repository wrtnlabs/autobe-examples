import { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_administrator_promotion_request_workflow(
  input?: DeepPartial<IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate>,
): IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "under_review",
        "approved",
        "rejected",
      ] as const),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
