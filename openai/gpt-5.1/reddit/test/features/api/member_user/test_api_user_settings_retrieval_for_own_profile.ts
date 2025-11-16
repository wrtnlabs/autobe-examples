import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Verify that a newly registered member user can retrieve their own
 * community-platform settings via their profile handle, and that the settings
 * object matches the expected DTO shape for a fresh account.
 *
 * Business flow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - Use random but valid username, email, and password values.
 *    - Provide valid URIs for href and referrer.
 *    - Rely on the SDK to attach the access token to the connection headers (no
 *         manual header manipulation).
 * 2. From the join response (ICommunityPlatformMemberuser.IAuthorized), read the
 *    `username`, which also serves as the global profile handle for the user.
 * 3. Call GET /communityPlatform/memberUser/profiles/{handle}/settings using that
 *    username as the handle.
 * 4. Assert that the call succeeds and the response is a valid
 *    ICommunityPlatformUserSettings instance via typia.assert.
 * 5. Perform light business-logic checks that are stable across implementations:
 *
 *    - All notification flags and visibility flags are booleans (already enforced by
 *         typia.assert).
 *    - Preferred_post_sort_mode and preferred_comment_sort_mode are non-empty
 *         strings.
 *    - Created_at and updated_at are present and valid date-time strings (enforced
 *         by typia.assert).
 *    - Preferred_language and timezone are either null/undefined or non-empty
 *         strings.
 * 6. Confirm that settings are not arbitrarily accessible by using a random,
 *    unrelated handle string that is extremely unlikely to map to the same
 *    user, and verifying that the settings call throws an error when invoked
 *    with that handle, using TestValidator.error.
 */
export async function test_api_user_settings_retrieval_for_own_profile(
  connection: api.IConnection,
) {
  // 1. Register a new member user using the join endpoint.
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Extract the username (profile handle) from the join response.
  const handle: string = authorized.username;

  // 3. Retrieve the user settings via profile handle.
  const settings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert<ICommunityPlatformUserSettings>(settings);

  // 4. Basic logical checks that complement typia.assert without
  //    re-validating types.
  TestValidator.predicate(
    "preferred_post_sort_mode should be a non-empty string",
    settings.preferred_post_sort_mode.length > 0,
  );
  TestValidator.predicate(
    "preferred_comment_sort_mode should be a non-empty string",
    settings.preferred_comment_sort_mode.length > 0,
  );

  // Optional fields: preferred_language and timezone should be either
  // null/undefined or non-empty strings.
  TestValidator.predicate(
    "preferred_language is null/undefined or non-empty",
    settings.preferred_language == null ||
      settings.preferred_language.length > 0,
  );
  TestValidator.predicate(
    "timezone is null/undefined or non-empty",
    settings.timezone == null || settings.timezone.length > 0,
  );

  // 5. Negative-path: calling settings with a random, unrelated handle
  //    should result in an error.
  const randomHandle: string = RandomGenerator.alphabets(16);
  await TestValidator.error("unknown handle should fail", async () => {
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle: randomHandle,
      },
    );
  });
}
