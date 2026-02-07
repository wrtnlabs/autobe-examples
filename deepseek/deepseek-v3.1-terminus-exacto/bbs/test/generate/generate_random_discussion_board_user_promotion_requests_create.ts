import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_promotion_request } from "../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function generate_random_discussion_board_user_promotion_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdministratorPromotionRequest.ICreate>;
  },
): Promise<IDiscussionBoardAdministratorPromotionRequest> {
  const prepared: IDiscussionBoardAdministratorPromotionRequest.ICreate =
    prepare_random_discussion_board_administrator_promotion_request(props.body);
  const result: IDiscussionBoardAdministratorPromotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      connection,
      { body: prepared },
    );
  return result;
}
