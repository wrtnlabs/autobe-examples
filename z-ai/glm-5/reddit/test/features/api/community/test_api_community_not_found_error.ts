import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent community returns a 404 Not Found error.
 *
 * This test validates error handling for non-existent community lookups.
 * A random community name is generated that is guaranteed not to exist
 * in the system, and the API should respond with HTTP 404 status.
 *
 * Steps:
 * 1. Generate a random community name that doesn't exist
 * 2. Request community details via GET /community/communities/{communityName}
 * 3. Validate that HTTP 404 error is returned
 */
export async function test_api_community_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community name that doesn't exist
  const nonExistentName = RandomGenerator.alphaNumeric(15);
  // Attempt to fetch non-existent community - should return 404
  await TestValidator.httpError(
    "non-existent community should return 404",
    404,
    async () =>
      await api.functional.community.communities.at(connection, {
        communityName: nonExistentName,
      }),
  );
}
