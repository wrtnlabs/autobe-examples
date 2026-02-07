import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_with_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // Create a test user with minimal profile data
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the user profile with minimal data
  const user = await api.functional.redditPlatform.users.at(connection, {
    userId: userId,
  });
  typia.assert(user);
}
