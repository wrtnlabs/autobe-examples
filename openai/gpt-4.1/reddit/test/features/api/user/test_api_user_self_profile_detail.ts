import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that a user can fetch their own detailed profile securely.
 *
 * Steps:
 *
 * 1. Register a new user and authenticate to receive a token and details.
 * 2. Fetch the user's own profile and assert the returned fields exactly match
 *    registration details, including email, display_name, and audit fields.
 * 3. Ensure password_hash and other sensitive fields are NOT present in the
 *    response.
 * 4. Try fetching a non-existent/deleted user's profile and assert an error is
 *    thrown.
 * 5. (Bonus) Attempt to fetch another user's profile using the test user's
 *    credentials and confirm permission denial (if possible).
 */
export async function test_api_user_self_profile_detail(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const display_name = RandomGenerator.name();
  const href = "https://example.com/register";
  const referrer = "https://google.com/";
  const auth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name,
        href,
        referrer,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(auth);
  // 2. Fetch the user's own profile
  const profile: ICommunityPlatformUser =
    await api.functional.communityPlatform.user.users.at(connection, {
      userId: auth.id,
    });
  typia.assert(profile);
  TestValidator.equals("profile id matches", profile.id, auth.id);
  TestValidator.equals("profile email matches", profile.email, auth.email);
  TestValidator.equals(
    "profile display_name matches",
    profile.display_name,
    display_name,
  );
  TestValidator.equals(
    "profile created_at matches",
    profile.created_at,
    auth.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches",
    profile.updated_at,
    auth.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active user",
    profile.deleted_at,
    null,
  );
  // 3. Assert unauthorized data is not exposed
  TestValidator.predicate(
    "profile does not contain sensitive auth fields",
    !("password_hash" in profile),
  );
  // 4. Try fetching a non-existent user (random UUID)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent user throws error",
    async () => {
      await api.functional.communityPlatform.user.users.at(connection, {
        userId: randomId,
      });
    },
  );
}
