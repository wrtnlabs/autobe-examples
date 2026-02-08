import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_at_nonexistent_community_fetch(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the GET /communityPlatform/communities/{communityId} endpoint
  // correctly returns a 404 Not Found error when requesting a community that does not exist.
  // Create a base connection (provided) and use it for unauthenticated request since no auth is required.
  // Generate a random UUID for non-existent community ID.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityId,
      });
    },
  );
}
