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
        size_bytes: true,
        started_at: true,
        completed_at: true,
        created_at: true,
        file_path: true,
        error_message: true,
        updated_at: true,
        deleted_at: true,
        initiatedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_backup_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBackupRecord.ISummary> {
    return typia.assert<IDiscussionBoardBackupRecord.ISummary>({
      id: typia.assert<string & tags.Format<"uuid">>(input.id),
      backup_type: typia.assert<"full" | "incremental">(input.backup_type),
      status: typia.assert<"pending" | "running" | "completed" | "failed">(
        input.status,
      ),
      size_bytes:
        input.size_bytes !== null
          ? typia.assert<number & tags.Type<"int32">>(input.size_bytes)
          : null,
      started_at:
        input.started_at !== null ? toISOStringSafe(input.started_at) : null,
      completed_at:
        input.completed_at !== null
          ? toISOStringSafe(input.completed_at)
          : null,
      created_at: toISOStringSafe(input.created_at),
      initiatedByAdmin:
        input.initiatedByAdmin !== null
          ? await DiscussionBoardAdminAtSummaryTransformer.transform(
              input.initiatedByAdmin,
            )
          : null,
    });
  }
}
