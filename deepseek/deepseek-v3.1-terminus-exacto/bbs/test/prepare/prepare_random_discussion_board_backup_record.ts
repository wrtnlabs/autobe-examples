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
    file_path:
      input?.file_path ??
      (Math.random() > 0.5
        ? `/backups/${RandomGenerator.alphabets(8)}.tar.gz`
        : null),
  };
}
