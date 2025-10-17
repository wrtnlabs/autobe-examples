import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

/**
 * Register a guest user and verify authorized payload issuance.
 *
 * Business flow
 *
 * 1. Prepare unique email/username and required consent timestamps (ISO strings)
 * 2. POST /auth/guestUser/join with ICommunityPlatformGuestUser.IJoin
 * 3. Expect ICommunityPlatformGuestUser.IAuthorized with token info
 * 4. Assert tokens are non-empty strings and role is guest when present
 * 5. Re-attempt with identical payload and expect failure (duplicate prevention)
 *
 * Notes
 *
 * - Type/schema conformance is validated by typia.assert
 * - Do not touch connection.headers (SDK manages Authorization internally)
 * - No HTTP status code assertions; only success/error behavior
 */
export async function test_api_guest_user_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare request body with unique identifiers and consent timestamps
  const email = typia.random<string & tags.Format<"email">>();
  const username = `guest_${RandomGenerator.alphaNumeric(10)}`;
  const nowIso = new Date().toISOString();
  const marketing = RandomGenerator.pick([true, false] as const);

  const joinBody = {
    email,
    username,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: marketing,
  } satisfies ICommunityPlatformGuestUser.IJoin;

  // 2) Perform registration
  const authorized: ICommunityPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });

  // 3) Validate response type and minimal business conditions
  typia.assert(authorized);

  TestValidator.predicate(
    "access token must be a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be a non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "role is guestUser or undefined",
    authorized.role === undefined || authorized.role === "guestUser",
  );

  // 4) Duplicate prevention: same email/username should be rejected
  await TestValidator.error(
    "duplicate join with same identifiers should fail",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: joinBody,
      });
    },
  );
}
