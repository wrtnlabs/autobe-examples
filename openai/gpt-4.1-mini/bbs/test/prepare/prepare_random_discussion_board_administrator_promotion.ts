import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_administrator_promotion(
  input?: DeepPartial<IDiscussionBoardAdministratorPromotion.ICreate>,
): IDiscussionBoardAdministratorPromotion.ICreate {
  return {
    discussion_board_administrator_id:
      input?.discussion_board_administrator_id ??
      typia.random<string & tags.Format<"uuid">>(),
    old_grade_id:
      input?.old_grade_id ?? typia.random<string & tags.Format<"uuid">>(),
    new_grade_id:
      input?.new_grade_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
