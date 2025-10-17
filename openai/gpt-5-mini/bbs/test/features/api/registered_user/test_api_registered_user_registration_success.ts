import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare a realistic, unique registration payload
  const username = RandomGenerator.alphaNumeric(8).toLowerCase();
  const email = `${username}.${Date.now()}@example.com`;
  const password = RandomGenerator.alphaNumeric(12); // >= 10 chars as recommended
  const display_name = RandomGenerator.name();

  const joinBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  // 2) Call the registration endpoint
  const output: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });

  // 3) Runtime type validation of the response
  typia.assert(output);

  // 4) Business logic assertions
  TestValidator.predicate("registered user id is present", !!output.id);

  TestValidator.predicate(
    "authorization token object is present",
    !!output.token &&
      typeof output.token.access === "string" &&
      typeof output.token.refresh === "string",
  );

  TestValidator.predicate(
    "access token appears JWT-like",
    output.token.access.includes("."),
  );
  TestValidator.predicate(
    "refresh token appears JWT-like",
    output.token.refresh.includes("."),
  );

  // Token expiration fields should be present (typia.assert already validated formats)
  TestValidator.predicate(
    "token.expired_at is present",
    !!output.token.expired_at,
  );
  TestValidator.predicate(
    "token.refreshable_until is present",
    !!output.token.refreshable_until,
  );

  if (output.username !== null && output.username !== undefined) {
    TestValidator.equals(
      "returned username matches request",
      output.username,
      username,
    );
  } else {
    TestValidator.predicate(
      "username not present in response (allowed)",
      output.username === null || output.username === undefined,
    );
  }

  // 5) DB-level verifications and teardown are out-of-scope for this SDK-level test
  // because no admin/DB APIs were provided in the materials. Recommended checks
  // (to be implemented in integration tests or with direct DB access):
  // - Verify econ_political_forum_registereduser row exists with username/email
  // - Verify stored password_hash != plaintext password
  // - Verify email_verified is false and verified_at is null
  // - Verify econ_political_forum_sessions row exists with refresh_token_hash and expires_at
  // - Cleanup: Remove created user and associated sessions
}
