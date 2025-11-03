import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

/**
 * Test the guest user registration workflow.
 *
 * This test validates the successful creation of a guest user account via the
 * /auth/guest/join endpoint. It ensures that all required properties are
 * returned correctly and comply with type-safe formats. The guest user receives
 * temporary tokens that enable browsing public content without credentials.
 *
 * Test Workflow:
 *
 * 1. Execute guest join request with empty body.
 * 2. Confirm the response includes correctly formatted id, created_at, and token.
 * 3. Verify optional guest sessions if available.
 * 4. Assert token properties access, refresh, expired_at, refreshable_until exist
 *    and are valid.
 */
export async function test_api_guest_join_registration(
  connection: api.IConnection,
) {
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {},
    });
  typia.assert(guest);

  TestValidator.predicate(
    "guest ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );
  TestValidator.predicate(
    "guest created_at is ISO date-time",
    !isNaN(Date.parse(guest.created_at)),
  );

  const token: IAuthorizationToken = guest.token;
  TestValidator.predicate(
    "token access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );

  if (
    guest.reddit_community_guest_sessions !== null &&
    guest.reddit_community_guest_sessions !== undefined
  ) {
    for (const session of guest.reddit_community_guest_sessions) {
      typia.assert(session);

      TestValidator.predicate(
        "session id is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );
      TestValidator.equals(
        "session guest id matches guest",
        session.reddit_community_guest_id,
        guest.id,
      );
      TestValidator.predicate(
        "session ip is string",
        typeof session.ip === "string" && session.ip.length > 0,
      );
      TestValidator.predicate(
        "session href is string",
        typeof session.href === "string" && session.href.length > 0,
      );
      TestValidator.predicate(
        "session referrer is string",
        typeof session.referrer === "string" && session.referrer.length >= 0,
      );
      TestValidator.predicate(
        "session created_at is ISO date-time",
        !isNaN(Date.parse(session.created_at)),
      );
      TestValidator.predicate(
        "session expired_at is ISO date-time or null or undefined",
        session.expired_at === null ||
          session.expired_at === undefined ||
          !isNaN(Date.parse(session.expired_at)),
      );
    }
  }
}
