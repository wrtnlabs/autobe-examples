import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_promotion } from "../prepare/prepare_random_discussion_board_administrator_promotion";

export async function generate_random_discussion_board_super_administrator_administrator_promotions_promote_administrator(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardAdministratorPromotion.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardAdministratorPromotion> {
  const prepared: IDiscussionBoardAdministratorPromotion.ICreate =
    prepare_random_discussion_board_administrator_promotion(props.body);
  const result: IDiscussionBoardAdministratorPromotion =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.promoteAdministrator(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
