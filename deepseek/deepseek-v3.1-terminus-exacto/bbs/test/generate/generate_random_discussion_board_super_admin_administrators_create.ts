import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_super_admin } from "../prepare/prepare_random_discussion_board_super_admin";

export async function generate_random_discussion_board_super_admin_administrators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSuperAdmin.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSuperAdmin> {
  const prepared: IDiscussionBoardSuperAdmin.ICreate =
    prepare_random_discussion_board_super_admin(props.body);
  const result: IDiscussionBoardSuperAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
