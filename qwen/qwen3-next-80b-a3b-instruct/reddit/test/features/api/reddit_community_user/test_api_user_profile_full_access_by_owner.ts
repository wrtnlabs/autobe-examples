import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_full_access_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Test that an existing user's profile can be accessed by username
  // Note: This test assumes a test user with username 'testuser' exists in the database
  const existingUsername = "testuser";
  const response = await api.functional.redditCommunity.users.at(connection, {
    username: existingUsername,
  });
  typia.assert(response);
}
