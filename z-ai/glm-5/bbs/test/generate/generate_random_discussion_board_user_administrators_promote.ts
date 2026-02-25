import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_admin_hierarchy_action } from "../prepare/prepare_random_discussion_board_admin_hierarchy_action";

export async function generate_random_discussion_board_user_administrators_promote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdminHierarchyAction.ICreate>;
    params: {
      administratorId: string;
    };
  },
): Promise<IDiscussionBoardUser> {
  const prepared: IDiscussionBoardAdminHierarchyAction.ICreate =
    prepare_random_discussion_board_admin_hierarchy_action(props.body);
  const result: IDiscussionBoardUser =
    await api.functional.discussionBoard.user.administrators.promote(
      connection,
      {
        administratorId: props.params.administratorId,
        body: prepared,
      },
    );
  return result;
}
