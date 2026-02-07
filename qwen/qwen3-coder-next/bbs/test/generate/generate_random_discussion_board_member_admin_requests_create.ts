import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_admins_request } from "../prepare/prepare_random_discussion_board_admins_request";

export async function generate_random_discussion_board_member_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdminsRequest.ICreate> | undefined;
  },
): Promise<IDiscussionBoardAdminsRequest> {
  const prepared: IDiscussionBoardAdminsRequest.ICreate =
    prepare_random_discussion_board_admins_request(props.body);
  const result: IDiscussionBoardAdminsRequest =
    await api.functional.discussionBoard.member.admin.requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
