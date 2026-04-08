import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent member profile returns 404 error.
 *
 * This test verifies that the API properly handles requests for
 * member profiles that do not exist, returning an appropriate
 * 404 Not Found HTTP error.
 *
 * Steps:
 * 1. Attempt to retrieve a profile using a non-existent UUID
 *
 * Validations:
 * - Response status should be 404 Not Found
 * - Response body should indicate the member was not found
 * - No profile data should be returned
 */
export async function test_api_member_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a well-known non-existent UUID
  const nonExistentMemberId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  // Validate that requesting a non-existent member returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent member",
    404,
    async () => {
      await api.functional.redditClone.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
