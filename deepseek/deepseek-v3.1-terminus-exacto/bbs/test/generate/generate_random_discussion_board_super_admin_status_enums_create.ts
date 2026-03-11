import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_status_enum } from "../prepare/prepare_random_discussion_board_status_enum";

export async function generate_random_discussion_board_super_admin_status_enums_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardStatusEnum.ICreate> | undefined;
  },
): Promise<IDiscussionBoardStatusEnum> {
  const prepared: IDiscussionBoardStatusEnum.ICreate =
    prepare_random_discussion_board_status_enum(props.body);
  const result: IDiscussionBoardStatusEnum =
    await api.functional.discussionBoard.superAdmin.status_enums.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
