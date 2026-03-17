import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_icon_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID format that does not correspond to any actual community
  const nonExistentCommunityId = typia.random<string>();
  // Create a test connection for the API call
  const testConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve the icon for non-existent community
  // This should return a 404 Not Found error
  await TestValidator.httpError(
    "non-existent community icon returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.communities.icon(testConnection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
