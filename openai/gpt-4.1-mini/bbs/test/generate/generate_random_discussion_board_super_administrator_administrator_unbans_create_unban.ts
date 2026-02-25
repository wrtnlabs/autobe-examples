import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_user_unban } from "../prepare/prepare_random_discussion_board_user_unban";

export async function generate_random_discussion_board_super_administrator_administrator_unbans_create_unban(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardUserUnban.ICreate>;
  },
): Promise<IDiscussionBoardUserUnban> {
  const prepared: IDiscussionBoardUserUnban.ICreate =
    prepare_random_discussion_board_user_unban(props.body);
  const result: IDiscussionBoardUserUnban =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.createUnban(
      connection,
      { body: prepared },
    );
  return result;
}
