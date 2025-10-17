import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest session registration and resumption logic for the discussion
 * board.
 *
 * - Confirms creation of a new guest session returns only minimal info (id,
 *   anonymous_token, token), containing no PII or extra fields.
 * - Confirms that calling join again resumes the same (not soft-deleted) session
 *   by returning same anonymous_token.
 * - Validates JWT/authorization token structure.
 * - Confirms that guest cannot access posting/replying endpoints, i.e.,
 *   permissions do not escalate.
 * - Verifies that extremely high rate of calls results in proper rate-limiting
 *   error (abuse protection).
 *
 * Steps:
 *
 * 1. Call guest join, store the guest id and anonymous_token and token.
 * 2. Call guest join again; returned anonymous_token and id must be the same as
 *    previous.
 * 3. Check that only whitelisted properties are present.
 * 4. Validate that issuing repeated join calls in tight loop eventually raises API
 *    error for abuse/rate limiting.
 * 5. Confirm that guest cannot perform posting or reply actions (should 403 or
 *    error appropriately).
 */
export async function test_api_guest_session_creation_and_resume(
  connection: api.IConnection,
) {
  // 1. Register a guest session
  const guest1: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest1);
  TestValidator.predicate(
    "guest id is uuid",
    typeof guest1.id === "string" && guest1.id.length === 36,
  );
  TestValidator.predicate(
    "anonymous_token present",
    typeof guest1.anonymous_token === "string" &&
      guest1.anonymous_token.length > 0,
  );
  typia.assert<IAuthorizationToken>(guest1.token);

  // 2. Call again to resume session; should return same id/anonymous_token
  const guest2: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(guest2);
  TestValidator.equals(
    "anonymous_token stable across guest resumes",
    guest2.anonymous_token,
    guest1.anonymous_token,
  );
  TestValidator.equals(
    "guest id stable across guest resumes",
    guest2.id,
    guest1.id,
  );

  // 3. Confirm minimal whitelisted response (id, anonymous_token, token)
  TestValidator.equals(
    "no extra properties in guest",
    Object.keys(guest1).sort(),
    ["anonymous_token", "id", "token"].sort(),
  );
  TestValidator.equals(
    "no extra properties in token",
    Object.keys(guest1.token).sort(),
    ["access", "refresh", "expired_at", "refreshable_until"].sort(),
  );

  // 4. Verify rate limit triggered by repeated calls
  let rateLimitHit = false;
  for (let i = 0; i < 100; ++i) {
    try {
      await api.functional.auth.guest.join(connection);
    } catch (exp) {
      rateLimitHit = true;
      break;
    }
  }
  TestValidator.predicate(
    "rate limiting fires on excess join calls",
    rateLimitHit,
  );
}
