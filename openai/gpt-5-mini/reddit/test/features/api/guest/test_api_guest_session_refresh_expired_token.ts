import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";

export async function test_api_guest_session_refresh_expired_token(
  connection: api.IConnection,
) {
  // 1) Create an initial guest session via POST /auth/guest/join
  const created: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ICommunityPortalGuest.ICreate,
    });
  typia.assert(created);

  // Ensure the response is well-formed (typia.assert above guarantees types).
  // 2) Negative test: attempt refresh with an obviously invalid token
  const invalidToken = `${created.guest_token}.invalid`;
  await TestValidator.error(
    "refresh with invalid guest_token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          guest_token: invalidToken,
        } satisfies ICommunityPortalGuest.IRefresh,
      });
    },
  );

  // 3) Expiry handling: if the created.expired_at exists and is in the past,
  // calling refresh with the real token must fail. Otherwise, perform a
  // nominal refresh and validate that the session record is returned and that
  // the server either rotated the token or updated expiry metadata.
  if (created.expired_at !== null && created.expired_at !== undefined) {
    const expiredAt = new Date(created.expired_at);
    const now = new Date();

    if (expiredAt.getTime() <= now.getTime()) {
      // Token already expired on issuance (edge case) → refresh must fail
      await TestValidator.error(
        "refresh with already-expired guest_token should be rejected",
        async () => {
          await api.functional.auth.guest.refresh(connection, {
            body: {
              guest_token: created.guest_token,
            } satisfies ICommunityPortalGuest.IRefresh,
          });
        },
      );
      // Nothing more to assert in this branch
      return;
    }
  }

  // 4) Attempt a nominal refresh with the original token (most environments
  // will return a renewed authorization). Validate returned structure and
  // key business expectations.
  const refreshed: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        guest_token: created.guest_token,
      } satisfies ICommunityPortalGuest.IRefresh,
    });
  typia.assert(refreshed);

  // Business assertions:
  // - The refresh should reference the same database record id
  TestValidator.equals(
    "refreshed record id matches created record id",
    refreshed.id,
    created.id,
  );

  // - The server SHOULD rotate guest_token or update expired_at on refresh.
  //   Assert that at least one of those changed when values are available.
  const tokenRotated = refreshed.guest_token !== created.guest_token;
  const expiryChanged =
    (created.expired_at ?? null) !== (refreshed.expired_at ?? null);
  TestValidator.predicate(
    "refresh results in token rotation or expiry update",
    tokenRotated || expiryChanged,
  );
}
