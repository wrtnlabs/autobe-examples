import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_thumbnail_retrieval_for_nonexistent_file(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any uploaded file
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve thumbnails for the non-existent file
  await TestValidator.httpError("404 for non-existent file", 404, async () => {
    await api.functional.redditClone.files.thumbnails.list(connection, {
      fileId: nonExistentFileId,
    });
  });
}
