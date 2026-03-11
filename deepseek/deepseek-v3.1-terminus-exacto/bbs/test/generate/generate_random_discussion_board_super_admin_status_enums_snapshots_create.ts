import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_status_enum_snapshot } from "../prepare/prepare_random_discussion_board_status_enum_snapshot";

export async function generate_random_discussion_board_super_admin_status_enums_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardStatusEnumSnapshot.ICreate>;
    params: {
      statusEnumId: string;
    };
  },
): Promise<IDiscussionBoardStatusEnumSnapshot> {
  const prepared: IDiscussionBoardStatusEnumSnapshot.ICreate =
    prepare_random_discussion_board_status_enum_snapshot(props.body);
  const result: IDiscussionBoardStatusEnumSnapshot =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.create(
      connection,
      {
        statusEnumId: props.params.statusEnumId,
        body: prepared,
      },
    );
  return result;
}
