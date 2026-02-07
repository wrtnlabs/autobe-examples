import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  // Test user profile retrieval by userId
  const retrievedUser = await api.functional.redditPlatform.users.at(
    connection,
    {
      userId: testUserId,
    },
  );
  typia.assert(retrievedUser);
}
