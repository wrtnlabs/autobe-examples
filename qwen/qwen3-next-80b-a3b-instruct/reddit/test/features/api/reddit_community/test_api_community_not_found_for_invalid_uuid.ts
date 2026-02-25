import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_not_found_for_invalid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection to test with
  const testConnection: api.IConnection = { host: connection.host };
  // Test: Non-existent UUID returns 404 Not Found
  // The business rule: return 404 for non-existent community ID, regardless of UUID format validity
  // Since the SDK enforces uuid format at compile time, we can only test a valid format UUID that doesn't exist
  await TestValidator.httpError(
    "non-existent UUID returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.communities.at(testConnection, {
        communityId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
