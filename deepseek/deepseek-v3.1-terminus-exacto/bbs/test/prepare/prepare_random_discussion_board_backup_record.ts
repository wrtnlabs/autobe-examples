import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_backup_record(
  input?: DeepPartial<IDiscussionBoardBackupRecord.ICreate>,
): IDiscussionBoardBackupRecord.ICreate {
  return {
    backup_type:
      input?.backup_type ??
      RandomGenerator.pick([
        "full",
        "incremental",
        "database_only",
        "files_only",
      ] as const),
    initiated_by_admin_id:
      input?.initiated_by_admin_id ??
      typia.random<string & tags.Format<"uuid">>(),
    file_path:
      input?.file_path ??
      `/backups/discussion-board/${RandomGenerator.alphaNumeric(8)}.tar.gz`,
    size_bytes:
      input?.size_bytes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
