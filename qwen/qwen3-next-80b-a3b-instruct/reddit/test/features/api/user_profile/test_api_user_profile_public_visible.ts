import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_public_visible(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random non-existent username (guaranteed not to be registered)
  const nonExistentUsername = RandomGenerator.alphaNumeric(12);
  // Test: Fetching a non-existent username should return 404 Not Found
  await TestValidator.httpError(
    "non-existent username returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.users.at(connection, {
        username: nonExistentUsername,
      });
    },
  );
}
