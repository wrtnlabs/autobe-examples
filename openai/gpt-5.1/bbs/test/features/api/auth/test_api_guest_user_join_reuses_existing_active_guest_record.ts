import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

/**
 * Validate that guestUser join reuses an existing active guest record when
 * called multiple times with the same anonymous_token, while rotating JWT
 * tokens.
 *
 * Business rules under test:
 *
 * - Discussion_board_guestusers has a unique index on anonymous_token.
 * - POST /auth/guestUser/join either creates a new guest record or reuses an
 *   existing one when the same anonymous_token is presented and the record is
 *   still active (deleted_at is null).
 * - When reusing, the backend must:
 *
 *   - Preserve id and created_at.
 *   - Keep anonymous_token unchanged.
 *   - Maintain deleted_at as null/undefined (still active).
 *   - Update updated_at to reflect the latest join.
 *   - Issue a fresh pair of JWT tokens (access/refresh) for the guestUser actor
 *       role.
 *
 * Test flow:
 *
 * 1. Generate a stable anonymous_token T1.
 * 2. Call join with T1 and some session context (href/referrer/ip), capture the
 *    returned IDiscussionBoardGuestUser.IAuthorized as first.
 * 3. Call join again with the same T1 but different context values, capture the
 *    second IDiscussionBoardGuestUser.IAuthorized as second.
 * 4. Assert that:
 *
 *    - Second.id === first.id (same guest record reused).
 *    - Second.anonymous_token === first.anonymous_token === T1.
 *    - Second.created_at === first.created_at.
 *    - Deleted_at in both responses is null or undefined (still active).
 *    - Second.updated_at is greater than or equal to first.updated_at (monotonic
 *         last-updated timestamp).
 *    - Second.token.access !== first.token.access and second.token.refresh !==
 *         first.token.refresh (credentials rotated).
 */
export async function test_api_guest_user_join_reuses_existing_active_guest_record(
  connection: api.IConnection,
) {
  // Step 1: Generate a stable anonymous_token for this test scenario.
  const anonymousToken: string = RandomGenerator.alphaNumeric(32);

  // Prepare first join payload using IDiscussionBoardGuestUser.IJoin.
  const firstJoinBody = {
    anonymous_token: anonymousToken,
    href: "https://example.com/board/thread/1",
    referrer: "https://example.com/board",
    ip: "192.168.0.10",
  } satisfies IDiscussionBoardGuestUser.IJoin;

  // Step 2: First join call to materialize guest record.
  const first: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(first);

  // Capture first state snapshot.
  const firstId = first.id;
  const firstAnonymousToken = first.anonymous_token;
  const firstCreatedAt = first.created_at;
  const firstUpdatedAt = first.updated_at;
  const firstDeletedAt = first.deleted_at ?? null;
  const firstAccessToken = first.token.access;
  const firstRefreshToken = first.token.refresh;

  // Basic invariants on first response.
  TestValidator.equals(
    "first join anonymous_token echoes request",
    firstAnonymousToken,
    anonymousToken,
  );
  TestValidator.equals(
    "first join deleted_at is null or undefined",
    firstDeletedAt,
    null,
  );

  // Step 3: Second join with same anonymous_token but different context.
  const secondJoinBody = {
    anonymous_token: anonymousToken,
    href: "https://example.com/board/thread/2",
    referrer: "https://example.com/landing",
    ip: "10.0.0.5",
  } satisfies IDiscussionBoardGuestUser.IJoin;

  const second: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(second);

  const secondId = second.id;
  const secondAnonymousToken = second.anonymous_token;
  const secondCreatedAt = second.created_at;
  const secondUpdatedAt = second.updated_at;
  const secondDeletedAt = second.deleted_at ?? null;
  const secondAccessToken = second.token.access;
  const secondRefreshToken = second.token.refresh;

  // Step 4: Identity reuse assertions.
  TestValidator.equals("id must be reused on second join", secondId, firstId);
  TestValidator.equals(
    "anonymous_token must remain identical across joins",
    secondAnonymousToken,
    firstAnonymousToken,
  );
  TestValidator.equals(
    "anonymous_token must match original request token",
    secondAnonymousToken,
    anonymousToken,
  );
  TestValidator.equals(
    "created_at must remain unchanged when reusing guest record",
    secondCreatedAt,
    firstCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains null after repeated joins",
    secondDeletedAt,
    null,
  );

  // Step 5: updated_at monotonicity check.
  const firstUpdatedMillis = Date.parse(firstUpdatedAt);
  const secondUpdatedMillis = Date.parse(secondUpdatedAt);
  TestValidator.predicate(
    "second updated_at is greater than or equal to first updated_at",
    secondUpdatedMillis >= firstUpdatedMillis,
  );

  // Step 6: Token rotation checks.
  TestValidator.notEquals(
    "access token must be rotated on second join",
    secondAccessToken,
    firstAccessToken,
  );
  TestValidator.notEquals(
    "refresh token must be rotated on second join",
    secondRefreshToken,
    firstRefreshToken,
  );
}
