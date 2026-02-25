import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardBackupRecordAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_backup_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        backup_type: true,
        status: true,
        file_path: true,
        size_bytes: true,
        started_at: true,
        completed_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        initiatedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_backup_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBackupRecord.ISummary> {
    return {
      id: input.id,
      backup_type: input.backup_type,
      status: input.status,
      size_bytes: input.size_bytes ?? undefined,
      started_at: input.started_at.toISOString(),
      completed_at: input.completed_at?.toISOString() ?? undefined,
      initiated_by_admin: input.initiatedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.initiatedByAdmin,
          )
        : null,
    };
  }
}
