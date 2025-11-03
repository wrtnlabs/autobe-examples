import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";

/**
 * Test listing of authenticated user sessions, audit of activity and security.
 *
 * Steps:
 *
 * 1. Register a new user (establishes initial session upon join)
 * 2. Optionally, simulate additional authentication for more than one session (not
 *    required to test pagination)
 * 3. Call the user sessions listing endpoint with active_only: true and paginated
 *    request
 * 4. Validate the response includes at least one session (the current session) for
 *    the correct user
 * 5. Confirm session summary fields present and do not include sensitive fields
 *    (ip, tokens, etc.)
 * 6. Attempt to query with a random non-existent userId and expect an error
 * 7. Attempt to access another user's session list and expect access forbidden
 *    error
 */
export async function test_api_user_sessions_listing_security_and_activity_audit(
  connection: api.IConnection,
) {
  // 1. Register a new user and create initial session
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
    // purposely omit ip for coverage
  } satisfies ICommunityPlatformUser.IJoin;
  const authorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(authorized);

  // 2. List own sessions with active_only
  const sessionRequest = {
    active_only: true,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformUserSession.IRequest;
  const sessionPage: IPageICommunityPlatformUserSession.ISummary =
    await api.functional.communityPlatform.user.users.sessions.index(
      connection,
      {
        userId: authorized.id,
        body: sessionRequest,
      },
    );
  typia.assert(sessionPage);
  TestValidator.predicate(
    "at least one session exists",
    sessionPage.data.length > 0,
  );

  // 3. Validate returned session summary fields & security
  for (const summary of sessionPage.data) {
    typia.assert<ICommunityPlatformUserSession.ISummary>(summary);
    // Should not have ip, tokens, password hashes, or extra sensitive fields
    TestValidator.predicate(
      "summary does not leak sensitive fields",
      !("ip" in summary) && !("token" in summary) && !("password" in summary),
    );
    TestValidator.equals(
      "session host matches registration href",
      summary.href,
      userJoinBody.href,
    );
    TestValidator.equals(
      "session referrer matches registration referrer",
      summary.referrer,
      userJoinBody.referrer,
    );
    TestValidator.predicate(
      "created_at is ISO8601",
      typeof summary.created_at === "string" &&
        summary.created_at.includes("T"),
    );
    if (summary.expired_at !== null && summary.expired_at !== undefined) {
      TestValidator.predicate(
        "expired_at is ISO8601 when present",
        typeof summary.expired_at === "string" &&
          summary.expired_at.includes("T"),
      );
    }
  }

  // 4. Query with a random non-existent userId and expect error
  await TestValidator.error(
    "listing sessions for non-existing userId should fail",
    async () => {
      await api.functional.communityPlatform.user.users.sessions.index(
        connection,
        {
          userId: typia.random<string & tags.Format<"uuid">>(),
          body: sessionRequest,
        },
      );
    },
  );

  // 5. Try to access session list as a different user (register second user)
  const anotherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/ad",
  } satisfies ICommunityPlatformUser.IJoin;
  const anotherAuthorized: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: anotherJoinBody });
  typia.assert(anotherAuthorized);

  await TestValidator.error(
    "another user cannot access this user's session list",
    async () => {
      await api.functional.communityPlatform.user.users.sessions.index(
        connection,
        {
          userId: authorized.id, // attempt to access first user's session as second user
          body: sessionRequest,
        },
      );
    },
  );
}
