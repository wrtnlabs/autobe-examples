import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_request } from "../prepare/prepare_random_discussion_board_administrator_request";

export async function generate_random_discussion_board_member_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardAdministratorRequest.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardAdministratorRequest> {
  const prepared: IDiscussionBoardAdministratorRequest.ICreate =
    prepare_random_discussion_board_administrator_request(props.body);
  return await api.functional.discussionBoard.member.requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
