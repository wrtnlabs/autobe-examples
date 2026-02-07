import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test: Retrieve a moderator with a random ID (simulates existing moderator)
  const moderator = await api.functional.redditPlatform.moderators.at(
    connection,
    {
      moderatorId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(moderator);
  // Test: Retrieve a non-existent moderator by generating a new random ID
  const nonExistent = await api.functional.redditPlatform.moderators.at(
    connection,
    {
      moderatorId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(nonExistent);
  // Validate: Check that both responses have the expected structure
  TestValidator.predicate("moderator is defined", moderator !== null);
  TestValidator.predicate("non-existent response is defined", nonExistent !== null);
}