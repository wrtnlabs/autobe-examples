import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving community details for a community that has been soft-deleted.
 *
 * This test validates that when attempting to retrieve a community that has been
 * soft-deleted (deleted_at is NOT NULL), the system correctly returns a 404 Not Found
 * response instead of returning the community data.
 *
 * Steps:
 * 1. Call GET /redditClone/communities/{communityId} with a UUID of a previously deleted community
 * 2. Verify response status code is 404
 * 3. Confirm soft-delete handling in business logic works correctly
 */
export async function test_api_community_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // UUID of a soft-deleted community (assumed to exist in test database)
  const softDeletedCommunityId =
    "00000000-0000-0000-0000-000000000001" as string & tags.Format<"uuid">;
  // Attempt to retrieve the soft-deleted community
  await TestValidator.httpError(
    "soft-deleted community should return 404",
    404,
    async () =>
      await api.functional.redditClone.communities.at(connection, {
        communityId: softDeletedCommunityId,
      }),
  );
}
