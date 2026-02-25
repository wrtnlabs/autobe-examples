import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_ban_reason_category } from "../prepare/prepare_random_discussion_board_ban_reason_category";

export async function generate_random_discussion_board_super_admin_ban_reason_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBanReasonCategory.ICreate>;
  },
): Promise<IDiscussionBoardBanReasonCategory> {
  const prepared: IDiscussionBoardBanReasonCategory.ICreate =
    prepare_random_discussion_board_ban_reason_category(props.body);
  const result: IDiscussionBoardBanReasonCategory =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
