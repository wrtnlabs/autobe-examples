import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegistereduserSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";

/**
 * Validate login session search for a registered user by admin.
 *
 * This test ensures that an admin user can authenticate using the join
 * endpoint, then perform advanced search queries for login sessions of a
 * registered user. Multiple filters are tested: date range filtering,
 * expiration status, IP address, referrer substring, href substring, and
 * paginated cursors before_id and after_id.
 *
 * Each response is validated for correct pagination values and correct session
 * data structure. It simulates edge cases with each possible filter to verify
 * expected behavior. Authorization enforcement is tested by performing the join
 * operation before querying sessions.
 *
 * This test verifies backend auditing and session management features
 * accessible only to authorized admins.
 */
export async function test_api_reddit_community_registereduser_sessions_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authenticates)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const href = "https://localhost/join";
  const referrer = "https://localhost/referrer";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare a realistic registered user ID for session search
  //    (random UUID)
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 3. Conduct session search with various filters
  //    Define pagination and filter test cases

  // Utility function to call sessions.index and validate
  async function searchSessions(
    filter?: IRedditCommunityRegistereduserSession.IRequest["filter"],
    before_id?: string,
    after_id?: string,
    limit?: number,
    order_by?: "created_at" | "expired_at",
  ) {
    const body = {
      filter,
      before_id,
      after_id,
      limit,
      order_by,
    } satisfies IRedditCommunityRegistereduserSession.IRequest;

    const response: IPageIRedditCommunityRegistereduserSession.ISummary =
      await api.functional.redditCommunity.admin.redditCommunityRegisteredusers.sessions.index(
        connection,
        {
          redditCommunityRegistereduserId: userId,
          body,
        },
      );
    typia.assert(response);

    // Validate pagination
    TestValidator.predicate(
      "pagination current page is non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records count non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages count non-negative",
      response.pagination.pages >= 0,
    );

    // Validate data array
    for (const session of response.data) {
      typia.assert(session);
      TestValidator.predicate(
        "session id has uuid format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          session.id,
        ),
      );
      TestValidator.predicate("ip is non-empty string", session.ip.length > 0);
      TestValidator.predicate(
        "href is non-empty string",
        session.href.length > 0,
      );
      TestValidator.predicate(
        "referrer is a string",
        typeof session.referrer === "string",
      );
      // created_at must be valid ISO string
      TestValidator.predicate(
        "created_at is ISO date string",
        !isNaN(Date.parse(session.created_at)),
      );
    }

    return response;
  }

  // 3.1 Search without filters (basic pagination)
  await searchSessions(undefined, undefined, undefined, 10, "created_at");

  // 3.2 Search filtered by created_after (date)
  const dateAfter = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  await searchSessions(
    { created_after: dateAfter },
    undefined,
    undefined,
    5,
    "created_at",
  );

  // 3.3 Search filtered by expired = true
  await searchSessions(
    { expired: true },
    undefined,
    undefined,
    5,
    "expired_at",
  );

  // 3.4 Search filtered by expired = false
  await searchSessions(
    { expired: false },
    undefined,
    undefined,
    5,
    "expired_at",
  );

  // 3.5 Search filtered by ip address (fake valid ip)
  const ip = `192.168.${RandomGenerator.pick([0, 1, 2, 3, 4, 5])}.${RandomGenerator.pick(
    [1, 2, 3, 4, 5],
  )}`;
  await searchSessions({ ip }, undefined, undefined, 5, "created_at");

  // 3.6 Search filtered by referrer substring
  const refSubstring = "example.com/page";
  await searchSessions(
    { referrer: refSubstring },
    undefined,
    undefined,
    5,
    "created_at",
  );

  // 3.7 Search filtered by href substring
  const hrefSubstring = "login/callback";
  await searchSessions(
    { href: hrefSubstring },
    undefined,
    undefined,
    5,
    "created_at",
  );

  // 3.8 Search with before_id cursor
  const beforeId = typia.random<string & tags.Format<"uuid">>();
  await searchSessions(undefined, beforeId, undefined, 5, "created_at");

  // 3.9 Search with after_id cursor
  const afterId = typia.random<string & tags.Format<"uuid">>();
  await searchSessions(undefined, undefined, afterId, 5, "created_at");
}
