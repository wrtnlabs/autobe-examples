import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_admin_request_decision } from "../prepare/prepare_random_discussion_board_admin_request_decision";

export async function generate_random_discussion_board_administrator_admin_requests_decisions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdminRequestDecision.ICreate>;
    params: {
      requestId: string;
    };
  },
): Promise<IDiscussionBoardAdminRequestDecision> {
  const prepared: IDiscussionBoardAdminRequestDecision.ICreate =
    prepare_random_discussion_board_admin_request_decision(props.body);
  return await api.functional.discussionBoard.administrator.admin_requests.decisions.create(
    connection,
    {
      body: prepared,
      requestId: props.params.requestId,
    },
  );
}
