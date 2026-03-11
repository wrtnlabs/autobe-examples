import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_admin_request_decision } from "../prepare/prepare_random_discussion_board_admin_request_decision";

export async function generate_random_discussion_board_super_admin_admin_request_decisions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardAdminRequestDecision.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardAdminRequestDecision> {
  const prepared: IDiscussionBoardAdminRequestDecision.ICreate =
    prepare_random_discussion_board_admin_request_decision(props.body);
  const result: IDiscussionBoardAdminRequestDecision =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
