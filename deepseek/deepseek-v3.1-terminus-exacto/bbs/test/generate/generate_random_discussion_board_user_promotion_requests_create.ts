import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_promotion_approval } from "../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function generate_random_discussion_board_user_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdministratorPromotionApproval.ICreate>;
  },
): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  const prepared: IDiscussionBoardAdministratorPromotionApproval.ICreate =
    prepare_random_discussion_board_administrator_promotion_approval(
      props.body,
    );
  const result: IDiscussionBoardAdministratorPromotionApproval =
    await api.functional.discussionBoard.user.promotion_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
