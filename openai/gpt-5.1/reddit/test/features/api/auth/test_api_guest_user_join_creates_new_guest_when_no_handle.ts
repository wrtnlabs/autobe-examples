import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Verify that joining as a guest without providing an anonymous_handle creates
 * a brand new guest identity and returns a valid authorized guest payload each
 * time.
 *
 * Business expectations:
 *
 * 1. When POST /auth/guestUser/join is called without anonymous_handle, the
 *    backend must create a fresh guest record in community_platform_guestusers
 *    and return an ICommunityPlatformGuestuser.IAuthorized envelope.
 * 2. The response must include a valid guest id, token payload, timestamps, and
 *    reflect an active (non-deleted) record.
 * 3. Because no anonymous_handle was provided, the authorized payload should not
 *    have a concrete handle value (anonymous_handle should be null or
 *    undefined).
 * 4. Repeating the join call without anonymous_handle should result in a different
 *    guest id (and practically, a different token), demonstrating that each
 *    such call establishes a new guest identity rather than reusing an existing
 *    one.
 *
 * Steps:
 *
 * 1. Build a valid ICommunityPlatformGuestuser.IJoin body with href and referrer
 *    as URI strings, omitting anonymous_handle.
 * 2. Call api.functional.auth.guestUser.join(connection, { body }) and assert the
 *    shape with typia.assert.
 * 3. Validate business invariants on id, token, timestamps, and
 *    anonymous_handle/deleted_at using TestValidator.
 * 4. Call join a second time with another body that also omits anonymous_handle
 *    and confirm that the second guest id differs from the first, and that both
 *    represent active guests.
 */
export async function test_api_guest_user_join_creates_new_guest_when_no_handle(
  connection: api.IConnection,
) {
  // 1. Prepare a join body without anonymous_handle.
  const joinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    // ip is optional and can be ipv4 or ipv6; we just pick one format.
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  // 2. First join call: should create a new guest and return an authorized payload.
  const firstAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });

  // Strongly validate the response type including nested token structure.
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(firstAuthorized);

  // 3. Business assertions for the first join.
  TestValidator.predicate(
    "guest id from first join must be a non-empty string",
    firstAuthorized.id.length > 0,
  );

  TestValidator.predicate(
    "access token from first join must be non-empty",
    firstAuthorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token from first join must be non-empty",
    firstAuthorized.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at from first join must be a non-empty timestamp string",
    firstAuthorized.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until from first join must be a non-empty timestamp string",
    firstAuthorized.token.refreshable_until.length > 0,
  );

  TestValidator.predicate(
    "created_at from first join must be a non-empty timestamp string",
    firstAuthorized.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at from first join must be a non-empty timestamp string",
    firstAuthorized.updated_at.length > 0,
  );

  // Because we did not send anonymous_handle, the backend should treat this
  // as a fresh guest identity without a concrete handle. The field is
  // optional and may be null or undefined, but must not be a non-empty
  // string in this scenario.
  TestValidator.predicate(
    "anonymous_handle from first join should be null or undefined when not provided",
    firstAuthorized.anonymous_handle === null ||
      firstAuthorized.anonymous_handle === undefined,
  );

  // Active guest: deleted_at should be null or undefined.
  TestValidator.predicate(
    "deleted_at from first join should be null or undefined for an active guest",
    firstAuthorized.deleted_at === null ||
      firstAuthorized.deleted_at === undefined,
  );

  // 4. Second join call without anonymous_handle should yield a different
  // guest identity.
  const secondJoinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 2 }),
    ip: typia.random<string & tags.Format<"ipv6">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const secondAuthorized: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });

  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(secondAuthorized);

  // Ensure the second guest id is different from the first, confirming that
  // each join without an anonymous_handle corresponds to a distinct guest
  // identity instead of reusing the initial one.
  TestValidator.notEquals(
    "second guest id should differ from first when no anonymous_handle is supplied",
    secondAuthorized.id,
    firstAuthorized.id,
  );

  // Tokens (particularly access tokens) should also differ.
  TestValidator.notEquals(
    "second access token should differ from first",
    secondAuthorized.token.access,
    firstAuthorized.token.access,
  );

  // Both guests must be active (deleted_at null/undefined) and have
  // populated timestamps.
  TestValidator.predicate(
    "second guest created_at must be non-empty",
    secondAuthorized.created_at.length > 0,
  );

  TestValidator.predicate(
    "second guest updated_at must be non-empty",
    secondAuthorized.updated_at.length > 0,
  );

  TestValidator.predicate(
    "second guest deleted_at should be null or undefined",
    secondAuthorized.deleted_at === null ||
      secondAuthorized.deleted_at === undefined,
  );
}
