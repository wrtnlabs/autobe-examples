import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

/**
 * Validate guest join behavior when the same anonymous token is reused,
 * standing in for a logically deleted guest record scenario.
 *
 * Business context:
 *
 * - The backend manages discussion_board_guestusers with an anonymous_token
 *   unique index and a nullable deleted_at for logical deletion.
 * - From the public API surface we cannot force deleted_at to non-null or inspect
 *   database state, but we can validate how repeated joins with the same
 *   anonymous_token behave and ensure that the DTO contract is respected (no
 *   leaked internal fields).
 *
 * Scenario implemented (compilation/black-box friendly):
 *
 * 1. Generate a random but stable anonymous_token representing a browser
 *    fingerprint.
 * 2. Call POST /auth/guestUser/join with that token and a realistic href and
 *    referrer, receiving IDiscussionBoardGuestUser.IAuthorized.
 * 3. Assert that:
 *
 *    - Response shape matches IAuthorized (typia.assert)
 *    - Anonymous_token echoes the input token
 *    - Id is a UUID
 *    - Created_at and updated_at are valid date-time strings
 *    - Deleted_at is null or undefined for a fresh active guest
 *    - Token is a well-formed IAuthorizationToken
 * 4. Call join again with the same anonymous_token and similar context.
 * 5. Assert that:
 *
 *    - The second call also succeeds (no rejection on reuse)
 *    - Id is identical to the first call’s id (indicating reuse of the same guest
 *         record rather than a new one)
 *    - Anonymous_token matches the input
 *    - Created_at remains the same between calls
 *    - Updated_at in the second response is equal to or later than the first
 *         updated_at
 *    - Deleted_at remains null or undefined (still active)
 *    - Token structure is still valid; we do not require any specific difference
 *         between first and second token values, as that’s an implementation
 *         detail.
 */
export async function test_api_guest_user_join_handles_logically_deleted_guest_record(
  connection: api.IConnection,
) {
  // 1. Prepare a stable anonymous token and context URLs
  const anonymousToken: string = RandomGenerator.alphaNumeric(32);

  const href: string & tags.Format<"uri"> =
    "https://example.com/board/thread/123" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://example.com/board" as string & tags.Format<"uri">;

  // 2. First join call: simulate initial guest materialization
  const firstJoin: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        anonymous_token: anonymousToken,
        href,
        referrer,
        ip: null,
      } satisfies IDiscussionBoardGuestUser.IJoin,
    });
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(firstJoin);

  // Basic DTO-level invariants for the first join
  TestValidator.equals(
    "first join anonymous_token round-trips",
    firstJoin.anonymous_token,
    anonymousToken,
  );

  // deleted_at should be null or undefined for an active guest
  TestValidator.predicate(
    "first join deleted_at is null or undefined",
    () => firstJoin.deleted_at === null || firstJoin.deleted_at === undefined,
  );

  // Token bundle presence is already type-guaranteed, but we ensure it’s
  // non-empty in a business sense (strings not empty)
  const firstToken: IAuthorizationToken = firstJoin.token;
  typia.assert<IAuthorizationToken>(firstToken);

  TestValidator.predicate(
    "first join access token is non-empty string",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first join refresh token is non-empty string",
    firstToken.refresh.length > 0,
  );

  // 3. Second join call with the same anonymous token
  const secondJoin: IDiscussionBoardGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        anonymous_token: anonymousToken,
        href,
        referrer,
        ip: null,
      } satisfies IDiscussionBoardGuestUser.IJoin,
    });
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(secondJoin);

  // 4. Cross-call consistency checks
  TestValidator.equals(
    "second join anonymous_token round-trips",
    secondJoin.anonymous_token,
    anonymousToken,
  );

  // We expect the same guest record to be reused, so ids should match
  TestValidator.equals(
    "guest id is stable across repeated joins",
    secondJoin.id,
    firstJoin.id,
  );

  // created_at should remain constant for the same record
  TestValidator.equals(
    "created_at remains unchanged across joins",
    secondJoin.created_at,
    firstJoin.created_at,
  );

  // updated_at should be the same or move forward in time
  TestValidator.predicate(
    "updated_at in second join is not earlier than first join",
    () =>
      new Date(secondJoin.updated_at).getTime() >=
      new Date(firstJoin.updated_at).getTime(),
  );

  // deleted_at should still be null or undefined (no logical deletion in between)
  TestValidator.predicate(
    "second join deleted_at is null or undefined",
    () => secondJoin.deleted_at === null || secondJoin.deleted_at === undefined,
  );

  const secondToken: IAuthorizationToken = secondJoin.token;
  typia.assert<IAuthorizationToken>(secondToken);

  TestValidator.predicate(
    "second join access token is non-empty string",
    secondToken.access.length > 0,
  );
  TestValidator.predicate(
    "second join refresh token is non-empty string",
    secondToken.refresh.length > 0,
  );
}
