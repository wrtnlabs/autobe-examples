import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_retrieval_active_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random username to retrieve
  const username = RandomGenerator.alphaNumeric(10);
  // Retrieve user profile by username
  const profile = await api.functional.redditPlatform.users.at(connection, {
    username: username,
  });
  typia.assert(profile);
  // Validate username matches the requested username
  TestValidator.equals("username matches request", profile.username, username);
  // Validate id is a valid UUID
  TestValidator.predicate("id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  // Validate karma is zero for newly created account
  TestValidator.equals("karma is zero for new account", profile.karma, 0);
  // Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // Validate created_at is valid ISO datetime
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(Date.parse(profile.created_at)),
  );
  // Validate updated_at is valid ISO datetime
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !isNaN(Date.parse(profile.updated_at)),
  );
}
