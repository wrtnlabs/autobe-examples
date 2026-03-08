import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent file returns a 404 error.
 *
 * This test verifies the business rule: "Return 404 if file not found"
 * by attempting to retrieve file metadata for a UUID that does not
 * correspond to any existing file in the system.
 */
export async function test_api_file_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that does not exist in the system
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting a non-existent file returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent file",
    404,
    async () =>
      await api.functional.communityPlatform.files.at(connection, {
        fileId: nonExistentFileId,
      }),
  );
}
