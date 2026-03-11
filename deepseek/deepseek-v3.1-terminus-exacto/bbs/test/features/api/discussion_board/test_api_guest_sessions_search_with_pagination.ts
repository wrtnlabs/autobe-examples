import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the basic guest session search functionality with pagination controls.
 * Verify that the endpoint returns a paginated list of guest sessions with proper
 * pagination metadata. Test different pagination parameters including page numbers
 * and limit values to ensure they work correctly. Validate that the response includes
 * the expected session fields: id, ip, href, created_at, expired_at. Test edge cases
 * like requesting page beyond available results (should return empty data array) and
 * limit values within acceptable ranges. Ensure the total records count matches the
 * actual number of matching sessions.
 */
export async function test_api_guest_sessions_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection for making authenticated requests
  const guestConnection: api.IConnection = { host: connection.host };
  // Create multiple guest sessions to generate test data
  const sessionCount = 5;
  const createdSessions: IDiscussionBoardGuest.IAuthorized[] = [];
  for (let i = 0; i < sessionCount; i++) {
    const guest = await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(guest);
    createdSessions.push(guest);
    // Create a new connection for each session to avoid token conflicts
    guestConnection.headers = { Authorization: guest.token.access };
  }
  // Use the last guest connection for search requests
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: createdSessions[createdSessions.length - 1].token.access,
    },
  };
  // Test 1: Search with default pagination (page=1, limit=100)
  const defaultSearch =
    await api.functional.discussionBoard.guest.sessions.index(
      searchConnection,
      {
        body: {} satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default page should be 1",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be 100",
    defaultSearch.pagination.limit === 100,
  );
  TestValidator.predicate(
    "total records should be at least created sessions",
    defaultSearch.pagination.records >= sessionCount,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    defaultSearch.data.length <= defaultSearch.pagination.limit,
  );
  // Validate each session has required fields
  for (const session of defaultSearch.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session has id field",
      typeof session.id === "string" && /^[0-9a-f-]{36}$/i.test(session.id),
    );
    TestValidator.predicate(
      "session has ip field",
      typeof session.ip === "string",
    );
    TestValidator.predicate(
      "session has href field",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session has created_at field",
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      "session has expired_at field",
      typeof session.expired_at === "string",
    );
  }
  // Test 2: Search with custom page and limit
  const customSearch =
    await api.functional.discussionBoard.guest.sessions.index(
      searchConnection,
      {
        body: {
          page: 1 satisfies number | null as number | null,
          limit: 2 satisfies number | null as number | null,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(customSearch);
  TestValidator.equals(
    "custom page should be 1",
    customSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit should be 2",
    customSearch.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data length should be <= limit",
    customSearch.data.length <= 2,
  );
  // Test pagination calculations
  TestValidator.predicate(
    "pages should be calculated correctly",
    customSearch.pagination.pages ===
      Math.ceil(
        customSearch.pagination.records / customSearch.pagination.limit,
      ),
  );
  // Test 3: Search with page beyond available results
  const pageBeyondResults =
    await api.functional.discussionBoard.guest.sessions.index(
      searchConnection,
      {
        body: {
          page: 100 satisfies number | null as number | null,
          limit: 10 satisfies number | null as number | null,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(pageBeyondResults);
  TestValidator.equals(
    "page beyond results should have empty data",
    pageBeyondResults.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be requested page",
    pageBeyondResults.pagination.current,
    100,
  );
  // Test 4: Search with different limit values
  const smallLimitSearch =
    await api.functional.discussionBoard.guest.sessions.index(
      searchConnection,
      {
        body: {
          limit: 1 satisfies number | null as number | null,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(smallLimitSearch);
  TestValidator.equals(
    "small limit search should have limit 1",
    smallLimitSearch.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length should be 1 or less",
    smallLimitSearch.data.length <= 1,
  );
  // Test 5: Validate that IP filtering works (optional parameter)
  const ipFilterSearch =
    await api.functional.discussionBoard.guest.sessions.index(
      searchConnection,
      {
        body: {
          ip: createdSessions[0].device_fingerprint satisfies
            | string
            | undefined as string | undefined,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(ipFilterSearch);
  // Total records with IP filter should be <= total records without filter
  TestValidator.predicate(
    "filtered records should not exceed unfiltered",
    ipFilterSearch.pagination.records <= defaultSearch.pagination.records,
  );
}
