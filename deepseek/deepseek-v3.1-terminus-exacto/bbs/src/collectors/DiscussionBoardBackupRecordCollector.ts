import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBackupRecordCollector {
  export async function collect(props: {
    body: IDiscussionBoardBackupRecord.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      backup_type: props.body.backup_type,
      status: "in_progress",
      file_path: props.body.file_path ?? null,
      size_bytes: null,
      started_at: new Date(),
      completed_at: null,
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      initiatedByAdmin: undefined,
    } satisfies Prisma.discussion_board_backup_recordsCreateInput;
  }
}
