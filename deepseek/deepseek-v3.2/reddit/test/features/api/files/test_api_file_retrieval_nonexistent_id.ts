import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't correspond to any file in the system
  const nonExistentFileId = typia.random<string & typia.tags.Format<"uuid">>();
  // Attempt to retrieve file metadata for non-existent file ID
  // Expect a 404 Not Found response with appropriate error message
  await TestValidator.httpError(
    "file retrieval should fail for non-existent ID",
    404,
    async () => {
      await api.functional.communityPlatform.files.at(connection, {
        fileId: nonExistentFileId satisfies string as string,
      });
    },
  );
  // No need to validate UUID format - typia.random ensures it's valid
  // The HttpError validation above ensures proper 404 response
}
