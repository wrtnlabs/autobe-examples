import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";

/**
 * Validate guest registration (POST /auth/guest/join) happy path.
 *
 * Business context:
 *
 * - Allows an unauthenticated visitor to receive a temporary guest identity and a
 *   short-lived authorization payload (access + refresh tokens).
 *
 * Steps:
 *
 * 1. Send minimal creation payload (empty object) to POST /auth/guest/join.
 * 2. Assert the returned payload matches IEconPoliticalForumGuest.IAuthorized
 *    using typia.assert(). This ensures id is UUID and token fields follow
 *    IAuthorizationToken (access, refresh, expired_at, refreshable_until).
 * 3. Execute business-level assertions using TestValidator:
 *
 *    - Tokens are present and non-empty
 *    - Expiration timestamps parse as date-times and access expiry is in future
 * 4. (Optional) If DB access is available in the test environment, verify a
 *    econ_political_forum_guest row exists with the returned id and deleted_at
 *    === null. This test does NOT touch connection.headers; the SDK
 *    automatically manages Authorization header when receiving tokens.
 */
export async function test_api_guest_join_success(connection: api.IConnection) {
  // 1) Prepare minimal request body (empty object is valid per ICreate)
  const requestBody = {} satisfies IEconPoliticalForumGuest.ICreate;

  // 2) Call the API
  const output: IEconPoliticalForumGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // 3) Type validation of entire response (ensures id is uuid and token shape is correct)
  typia.assert(output);

  // 4) Business-level validations
  TestValidator.predicate(
    "access token is present and non-empty",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is a valid future date",
    (() => {
      try {
        const t = Date.parse(output.token.expired_at);
        return !Number.isNaN(t) && t > Date.now();
      } catch {
        return false;
      }
    })(),
  );

  // typia.assert already ensures output.id is a UUID via tags.Format<"uuid">.
  // But include an explicit predicate to assert presence (not format check).
  TestValidator.predicate(
    "guest id is present",
    typeof output.id === "string" && output.id.length > 0,
  );

  // Optional DB assertion (commented): If test infra exposes DB, verify the row.
  // Example (pseudo-code):
  // const dbRow = await db.econ_political_forum_guest.findUnique({ where: { id: output.id } });
  // TestValidator.predicate("guest row created in DB", !!dbRow && dbRow.deleted_at === null);

  // Teardown note: Guests are ephemeral; if the system requires explicit cleanup
  // create a deletion call here. Otherwise the test environment should garbage
  // collect or reset DB between test runs.
}
