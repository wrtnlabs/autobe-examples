import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";

/**
 * Validate successful user session refresh after self-signup.
 *
 * Workflow:
 *
 * 1. Join a brand-new member to obtain initial authorized payload (access/refresh
 *    tokens)
 * 2. Refresh using the returned refresh token
 * 3. Validate identity continuity and practical token usability signals
 *
 * Notes:
 *
 * - We do not validate refresh rotation semantics; only success and continuity
 * - We do not touch connection.headers; SDK manages Authorization propagation
 */
export async function test_api_user_session_refresh_success(
  connection: api.IConnection,
) {
  // 1) Create a new user (self-signup) to establish an active session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
    // Explicitly allow null ip to follow optional context semantics
    ip: null,
    href: `https://app.example.com/${RandomGenerator.alphaNumeric(12)}`,
    referrer: `https://ref.example.com/${RandomGenerator.alphaNumeric(10)}`,
  } satisfies ICivicBoardUser.ICreate;

  const joined: ICivicBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(joined);

  // If server provided a user summary, its id must match the authorized id
  if (joined.user !== undefined) {
    TestValidator.equals(
      "summary id equals authorized id",
      joined.user.id,
      joined.id,
    );
  }

  // 2) Refresh using the refresh token from the joined session
  const refreshBody = {
    refresh_token: joined.token.refresh,
  } satisfies ICivicBoardUserSession.IRequest;

  const refreshed: ICivicBoardUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // 3) Business validations
  // Identity continuity: id should persist across join -> refresh
  TestValidator.equals(
    "refreshed id equals joined id",
    refreshed.id,
    joined.id,
  );

  // Practical usability signals: non-empty token strings after refresh
  TestValidator.predicate(
    "refreshed access token must be non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty",
    refreshed.token.refresh.length > 0,
  );
}
