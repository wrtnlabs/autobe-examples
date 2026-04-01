import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for this test scenario
  const testConnection: api.IConnection = { host: connection.host };
  // Test 1: Request community with random non-existent name
  const randomCommunityName = `nonexistent_${RandomGenerator.alphabets(10)}`;
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      await api.functional.redditCommunity.communities.at(testConnection, {
        communityName: randomCommunityName,
      });
    },
  );
  // Test 2: Request community with UUID format name that doesn't exist
  const uuidCommunityName = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent UUID community name",
    404,
    async () => {
      await api.functional.redditCommunity.communities.at(testConnection, {
        communityName: uuidCommunityName,
      });
    },
  );
  // Test 3: Request community with special characters that doesn't exist
  const specialCharCommunityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.httpError(
    "should return 404 for non-existent community with special characters",
    404,
    async () => {
      await api.functional.redditCommunity.communities.at(testConnection, {
        communityName: specialCharCommunityName,
      });
    },
  );
}
