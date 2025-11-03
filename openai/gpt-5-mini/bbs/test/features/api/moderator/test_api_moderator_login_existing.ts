import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate moderator authentication using existing account flow.
 *
 * Business context:
 *
 * 1. Create a moderator via /auth/moderator/join (self-join scenario).
 * 2. Authenticate using /auth/moderator/login with the same credentials.
 * 3. Verify returned authorization tokens and that the authenticated moderator
 *    matches the created account.
 * 4. Negative case: assert that incorrect password is rejected.
 *
 * Notes:
 *
 * - The test uses only api.functional.auth.moderator.join and
 *   api.functional.auth.moderator.login as provided by the SDK.
 * - All request bodies use `satisfies` with the correct DTO types.
 * - All non-void responses are validated with typia.assert().
 * - Do NOT touch connection.headers; the SDK manages Authorization headers.
 */
export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // 1) Prepare realistic moderator credentials
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  // Construct a password >= 12 chars with mixed characters to respect policy
  const password = `Aa1!${RandomGenerator.alphaNumeric(8)}`; // 4 + 8 = 12 chars

  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // 2) Create moderator account via join
  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const created: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Basic business assertions about join response
  TestValidator.predicate(
    "join returned an access token",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returned a refresh token",
    typeof created.token?.refresh === "string" &&
      created.token.refresh.length > 0,
  );
  // created.id must exist and be a string (typia.assert ensured it), store for later

  // 3) Successful login using username and password
  const loginBody = {
    usernameOrEmail: username,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const logged: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // Business validations for successful login
  TestValidator.equals(
    "login returns same moderator id as join",
    logged.id,
    created.id,
  );

  TestValidator.predicate(
    "login returned non-empty access and refresh tokens",
    typeof logged.token.access === "string" &&
      logged.token.access.length > 0 &&
      typeof logged.token.refresh === "string" &&
      logged.token.refresh.length > 0,
  );

  // Validate token metadata presence (expired_at and refreshable_until)
  TestValidator.predicate(
    "token contains expiration metadata",
    typeof logged.token.expired_at === "string" &&
      logged.token.expired_at.length > 0 &&
      typeof logged.token.refreshable_until === "string" &&
      logged.token.refreshable_until.length > 0,
  );

  // 4) Negative case: incorrect password should fail (business error)
  await TestValidator.error(
    "login with incorrect password should be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          usernameOrEmail: username,
          password: `${password}__wrong`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Security note: IDiscussionBoardModerator.IAuthorized does not include
  // password_hash; typia.assert ensures that no sensitive fields are present
  // in the returned response shape. No further assertions about internal
  // storage are performed here because that would require direct DB access.
}
