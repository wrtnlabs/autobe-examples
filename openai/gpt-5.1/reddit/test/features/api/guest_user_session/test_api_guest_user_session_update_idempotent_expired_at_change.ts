import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that updating a guest user session's expiration timestamp with the
 * same value multiple times is logically idempotent from the API consumer
 * perspective.
 *
 * Business context:
 *
 * - Platform administrators can inspect and administratively adjust guest
 *   sessions using the platformAdmin surface.
 * - For security and audit use-cases, marking a session as expired (or updating
 *   its `expired_at` timestamp) should be a stable operation: repeating the
 *   same update with the same value must not create new sessions, regress
 *   timestamps, or unexpectedly mutate other immutable fields.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join. The SDK automatically wires the issued access
 *    token onto the `connection` headers, so subsequent
 *    communityPlatform.platformAdmin.* calls run under this actor.
 * 2. Create a sample account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses. This exercises the
 *    dependency but is not directly required by the session update endpoint.
 * 3. Choose a pair of random UUIDs to represent `guestUserId` and `sessionId`.
 *    Because we have no explicit guest-session creation API in the provided
 *    SDK, we use these purely as identifiers for the update call and focus the
 *    test on idempotent behavior of the API, not on lifecycle wiring.
 * 4. Construct a concrete ISO-8601 date-time string for `expired_at` using `new
 *    Date().toISOString()`, satisfying the `string & tags.Format<"date-time">`
 *    constraint.
 * 5. Invoke PUT
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    with body `{ expired_at }` and capture the first
 *    `ICommunityPlatformGuestuserSession` response.
 * 6. Immediately repeat the identical PUT call (same IDs, same `expired_at`) and
 *    capture the second response.
 * 7. Assert idempotency characteristics:
 *
 *    - `id` is the same in both responses.
 *    - `guestUser.id` is stable across responses.
 *    - `expired_at` in both responses equals the requested ISO string.
 *    - `created_at` is unchanged.
 *    - Other fields such as `ip`, `href`, `referrer`, and nested `guestUser` summary
 *         fields remain equal between the two responses.
 */
export async function test_api_guest_user_session_update_idempotent_expired_at_change(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: adminJoinBody },
  );
  typia.assert(adminAuthorized);

  // 2. Create a sample account status to satisfy the dependency chain.
  const accountStatusBody = {
    key: `GUEST_STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: "Guest Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(createdStatus);

  // 3. Prepare identifiers for the guest user and session.
  const guestUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare the target expiration timestamp in ISO-8601 format.
  const targetExpiredAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    expired_at: targetExpiredAt,
  } satisfies ICommunityPlatformGuestuserSession.IUpdate;

  // 5. First update call.
  const firstSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
      connection,
      {
        guestUserId,
        sessionId,
        body: updateBody,
      },
    );
  typia.assert(firstSession);

  // 6. Second update call with an identical payload.
  const secondSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
      connection,
      {
        guestUserId,
        sessionId,
        body: updateBody,
      },
    );
  typia.assert(secondSession);

  // 7. Idempotency assertions.
  TestValidator.equals(
    "session id remains stable across identical updates",
    firstSession.id,
    secondSession.id,
  );

  TestValidator.equals(
    "guest user id remains stable across identical updates",
    firstSession.guestUser.id,
    secondSession.guestUser.id,
  );

  TestValidator.equals(
    "expired_at in first response equals requested value",
    firstSession.expired_at,
    targetExpiredAt,
  );

  TestValidator.equals(
    "expired_at in second response equals requested value",
    secondSession.expired_at,
    targetExpiredAt,
  );

  TestValidator.equals(
    "created_at timestamp is unchanged between updates",
    firstSession.created_at,
    secondSession.created_at,
  );

  TestValidator.equals(
    "ip remains unchanged between updates",
    firstSession.ip,
    secondSession.ip,
  );

  TestValidator.equals(
    "href remains unchanged between updates",
    firstSession.href,
    secondSession.href,
  );

  TestValidator.equals(
    "referrer remains unchanged between updates",
    firstSession.referrer,
    secondSession.referrer,
  );

  TestValidator.equals(
    "guest user created_at remains unchanged between updates",
    firstSession.guestUser.created_at,
    secondSession.guestUser.created_at,
  );

  TestValidator.equals(
    "guest user accountStatus presence remains consistent",
    firstSession.guestUser.accountStatus,
    secondSession.guestUser.accountStatus,
  );
}
