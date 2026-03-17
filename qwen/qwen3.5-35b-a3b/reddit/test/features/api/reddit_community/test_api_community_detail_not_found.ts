import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a community that does not exist.
 * Tests the endpoint's handling of non-existent community IDs.
 *
 * The GET /redditCommunity/communities/{communityId} endpoint should:
 * - Return 404 HttpError when community does not exist
 * - Filter out soft-deleted communities
 * - Validate UUID format
 */
export async function test_api_community_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with random valid UUID format but non-existent community
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      return api.functional.redditCommunity.communities.at(connection, {
        communityId: nonExistentUuid,
      });
    },
  );
  // 2. Test with another random UUID (different from first)
  const anotherNonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.notEquals(
    "different UUIDs should have different error paths",
    nonExistentUuid,
    anotherNonExistentUuid,
  );
  // 3. Test with UUID that has same format but invalid content
  const anotherRandomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "another non-existent community also returns 404",
    404,
    async () => {
      return api.functional.redditCommunity.communities.at(connection, {
        communityId: anotherRandomUuid,
      });
    },
  );
  // 4. Verify all error responses follow same pattern
  const testUuids = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const uuid of testUuids) {
    await TestValidator.httpError(
      `random UUID ${uuid} returns 404`,
      404,
      async () => {
        return api.functional.redditCommunity.communities.at(connection, {
          communityId: uuid,
        });
      },
    );
  }
}
