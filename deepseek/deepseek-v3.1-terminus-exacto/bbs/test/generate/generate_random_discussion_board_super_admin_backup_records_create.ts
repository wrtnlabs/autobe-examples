import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_backup_record } from "../prepare/prepare_random_discussion_board_backup_record";

export async function generate_random_discussion_board_super_admin_backup_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardBackupRecord.ICreate>;
  },
): Promise<IDiscussionBoardBackupRecord> {
  const prepared: IDiscussionBoardBackupRecord.ICreate =
    prepare_random_discussion_board_backup_record(props.body);
  const result: IDiscussionBoardBackupRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
