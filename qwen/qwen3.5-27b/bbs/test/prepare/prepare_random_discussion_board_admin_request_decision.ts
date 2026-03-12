import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_admin_request_decision(
  input?: DeepPartial<IDiscussionBoardAdminRequestDecision.ICreate>,
): IDiscussionBoardAdminRequestDecision.ICreate {
  return {
    decision_type:
      input?.decision_type ??
      RandomGenerator.pick(["approved", "rejected"] as const),
    decision_context:
      input?.decision_context ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
