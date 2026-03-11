import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_status_type } from "../prepare/prepare_random_discussion_board_status_type";

export async function generate_random_discussion_board_admin_status_types_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardStatusType.ICreate>;
  },
): Promise<IDiscussionBoardStatusType> {
  const prepared: IDiscussionBoardStatusType.ICreate =
    prepare_random_discussion_board_status_type(props.body);
  const result: IDiscussionBoardStatusType =
    await api.functional.discussionBoard.admin.status_types.create(connection, {
      body: prepared,
    });
  return result;
}
