import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that definitely doesn't exist in the database
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Try to retrieve a community that doesn't exist - this should throw an error
  await TestValidator.error(
    "should return 404 for non-existent community",
    async () => {
      await api.functional.redditClone.communities.at(connection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
