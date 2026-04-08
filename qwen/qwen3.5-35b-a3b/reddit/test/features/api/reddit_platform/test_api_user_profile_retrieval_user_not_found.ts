import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_user_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const apiConnection: api.IConnection = { host: connection.host };
  // Generate a random username that is extremely unlikely to exist
  const nonExistentUsername = RandomGenerator.alphabets(12);
  // Validate that the API returns 404 for non-existent user
  await TestValidator.httpError(
    "should return 404 for non-existent username",
    404,
    async () =>
      await api.functional.redditPlatform.users.at(apiConnection, {
        username: nonExistentUsername,
      }),
  );
}
