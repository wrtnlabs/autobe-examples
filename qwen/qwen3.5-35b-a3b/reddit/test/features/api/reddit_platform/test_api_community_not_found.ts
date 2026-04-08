import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a unique community name that likely doesn't exist
  const nonExistentName = RandomGenerator.alphaNumeric(16);
  // 2. Call the community endpoint with non-existent name
  // This should throw a 404 HttpError
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () => {
      return await api.functional.redditPlatform.communities.at(connection, {
        name: nonExistentName,
      });
    },
  );
}
