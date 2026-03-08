import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent community returns a 404 error.
 *
 * This test verifies that the community lookup endpoint properly handles
 * requests for non-existent communities by returning an appropriate 404 error.
 */
export async function test_api_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community name that definitely doesn't exist
  const nonExistentCommunityName = RandomGenerator.alphaNumeric(32);
  // Verify that requesting a non-existent community returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityName: nonExistentCommunityName,
      });
    },
  );
}
