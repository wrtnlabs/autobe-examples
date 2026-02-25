import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_admin_request } from "../prepare/prepare_random_discussion_board_admin_request";

export async function generate_random_discussion_board_user_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdminRequest.ICreate>;
  },
): Promise<IDiscussionBoardAdminRequest> {
  const prepared: IDiscussionBoardAdminRequest.ICreate =
    prepare_random_discussion_board_admin_request(props.body);
  const result: IDiscussionBoardAdminRequest =
    await api.functional.discussionBoard.user.adminRequests.create(connection, {
      body: prepared,
    });
  return result;
}
