import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test with non-existent community name
  const nonExistentName = `nonexistent_${RandomGenerator.alphaNumeric(8)}`;
  // Verify 404 error for non-existent community
  await TestValidator.httpError("community not found", 404, async () => {
    await api.functional.redditLike.communities.at(connection, {
      communityName: nonExistentName,
    });
  });
  // Test case sensitivity in error handling
  const mixedCaseName = `MixedCase_${RandomGenerator.alphaNumeric(6)}`;
  await TestValidator.httpError(
    "mixed case community not found",
    404,
    async () => {
      await api.functional.redditLike.communities.at(connection, {
        communityName: mixedCaseName,
      });
    },
  );
}
