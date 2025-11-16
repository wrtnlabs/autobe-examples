import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate that community moderator login fails when an incorrect password is
 * used.
 *
 * Business intent:
 *
 * - Ensure that even for an existing, active community moderator account created
 *   via the join endpoint, supplying a wrong password to the login endpoint
 *   must not yield an IAuthorized context.
 * - The test focuses on runtime business logic (credential verification) and
 *   avoids any type-error or HTTP-status-specific assertions as required by the
 *   E2E testing rules.
 *
 * High level flow:
 *
 * 1. Register a new community moderator using POST /auth/communityModerator/join.
 *
 *    - Use a deterministic username/email so that they can be reused in the login
 *         attempt.
 *    - Use a known correct password value.
 *    - Provide required contextual fields href and referrer with valid URL formats.
 * 2. Confirm that join succeeded and the response is a valid IAuthorized object
 *    using typia.assert.
 * 3. Attempt to log in via POST /auth/communityModerator/login with:
 *
 *    - Identifier equal to the email used during join (or username if preferred),
 *    - Password intentionally incorrect (e.g., correct password with an extra
 *         suffix),
 *    - Optional href/referrer omitted for simplicity.
 * 4. Use TestValidator.error to assert that login with wrong password throws,
 *    meaning authentication is rejected and no IAuthorized payload is
 *    returned.
 *
 * Constraints and exclusions:
 *
 * - Do not test HTTP status codes or error payload structure.
 * - Do not attempt to observe DB side effects like session rows or account_status
 *   changes.
 * - Do not construct invalid-typed requests; all DTOs must be correctly shaped.
 */
export async function test_api_community_moderator_login_with_wrong_password(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic but random-looking join payload.
  const password = "CorrectPassword!123";

  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/auth/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized);

  // 2. Attempt login with wrong password using same identifier (email).
  const wrongPassword = `${password}!`;

  const loginBodyWrong = {
    identifier: joinBody.email,
    password: wrongPassword,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  await TestValidator.error(
    "community moderator login must fail with wrong password",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: loginBodyWrong,
      });
    },
  );
}
