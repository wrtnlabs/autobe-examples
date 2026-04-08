import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_scan_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing file
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // Call GET /redditClone/files/{fileId}/scans with the non-existent UUID
  // Expect a 404 error since the file doesn't exist
  await TestValidator.httpError(
    "file not found should return 404",
    404,
    async () => {
      await api.functional.redditClone.files.scans.at(connection, {
        fileId: nonExistentFileId,
      });
    },
  );
}
