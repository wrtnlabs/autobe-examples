import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community get not found scenario.
 * 1. Generate a non-existent UUID for testing
 * 2. Validate that non-existent community returns 404 Not Found
 * 3. Test with multiple different non-existent UUIDs
 */
export async function test_api_community_get_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent UUID for testing
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test that non-existent community returns 404
  await TestValidator.httpError(
    "non-existent community should return 404 Not Found",
    404,
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityId: nonExistentId,
      });
    },
  );
  // Generate another non-existent UUID to verify consistent behavior
  const anotherNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "different non-existent community should also return 404",
    404,
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityId: anotherNonExistentId,
      });
    },
  );
}
