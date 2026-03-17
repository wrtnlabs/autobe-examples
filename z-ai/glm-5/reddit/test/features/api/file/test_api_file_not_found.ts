import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve file metadata with non-existent UUID
  // Expecting 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent file",
    404,
    async () => {
      await api.functional.communityPlatform.files.at(connection, {
        fileId: nonExistentFileId,
      });
    },
  );
}
