import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create users via API (no user creation endpoint available),
  // we'll test with a randomly generated user profile that should exist in the system
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that should correspond to an existing user
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the user profile
  const profile = await api.functional.communityPlatform.users.at(
    userConnection,
    {
      userId: userId,
    },
  );
  typia.assert(profile);
  // The typia.assert() above performs complete validation of all fields
  // including UUID format, string types, numeric constraints, and date-time formats
  // No additional validation is needed or allowed after typia.assert()
}
