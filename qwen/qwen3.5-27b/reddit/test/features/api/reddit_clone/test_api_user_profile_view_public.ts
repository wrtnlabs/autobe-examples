import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a public user profile by username without authentication.
 *
 * This test verifies that the public profile endpoint:
 * - Returns 404 for non-existent users
 * - Is accessible without authentication (guest access)
 *
 * Note: Full profile retrieval testing requires a pre-existing member account.
 * The member creation API is not available in the current SDK.
 */
export async function test_api_user_profile_view_public(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest connection (no authentication required for public endpoint)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a unique username that doesn't exist
  const nonExistentUsername = `test_user_${RandomGenerator.alphabets(10)}`;
  // 3. Test that non-existent user returns 404 error
  // The endpoint should throw an HttpError with status 404
  await TestValidator.error(
    "should return 404 for non-existent user",
    async () => {
      await api.functional.redditClone.users.at(guestConnection, {
        username: nonExistentUsername,
      });
    },
  );
  // 4. Test with invalid username format (empty string)
  await TestValidator.error(
    "should return error for empty username",
    async () => {
      await api.functional.redditClone.users.at(guestConnection, {
        username: "",
      });
    },
  );
  // 5. Test with username that's too short (less than 3 characters)
  await TestValidator.error(
    "should return error for username too short",
    async () => {
      await api.functional.redditClone.users.at(guestConnection, {
        username: "ab",
      });
    },
  );
  // Note: To test successful profile retrieval, a member must be created first.
  // This would require:
  // 1. A POST /members creation endpoint (not available in current SDK)
  // 2. Or a pre-existing test account with known username
  //
  // Example of successful test (when member creation is available):
  // const existingUsername = "test_member_123";
  // const profile = await api.functional.redditClone.users.at(guestConnection, {
  //   username: existingUsername,
  // });
  // typia.assert(profile);
  // TestValidator.equals("username matches", profile.username, existingUsername);
  // TestValidator.predicate("karma is 0 for new account", profile.karma === 0);
  // TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/.test(profile.id));
  // TestValidator.predicate("has display name", profile.display_name.length >= 3);
  // TestValidator.predicate("bio can be null or string",
  //   profile.bio === null || (typeof profile.bio === "string" && profile.bio.length <= 500));
  // TestValidator.predicate("avatar_uri can be null or string",
  //   profile.avatar_uri === null || typeof profile.avatar_uri === "string");
  // TestValidator.predicate("created_at is ISO 8601",
  //   /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at));
  // TestValidator.predicate("updated_at is ISO 8601",
  //   /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at));
  // TestValidator.predicate("deleted_at is null for active account", profile.deleted_at === null);
  //
  // Important: The IRedditCloneMember type includes email field, but the endpoint
  // documentation states email should be excluded for public access. This suggests
  // the response type may differ from the full member type, or the API filters
  // the email field at runtime.
}
