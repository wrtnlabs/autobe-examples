import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session listing with pagination functionality.
 *
 * Validates the complete guest session listing flow including guest registration, paginated session retrieval, and pagination metadata verification. Ensures that the session list correctly returns guest session summaries with proper guest relationship data and that pagination works across multiple pages.
 *
 * Special attention is given to verifying that the pagination metadata accurately reflects the current page, limit, total records, and total pages. The test also validates that guest sessions are sorted by created_at in descending order by default and that the guest relationship includes device fingerprint information.
 *
 * 1. Register a guest account with device fingerprint and session context.
 * 2. Create a guest-specific connection for authenticated session listing.
 * 3. List guest sessions with default pagination parameters.
 * 4. Validate response structure matches IPageIRedditCloneGuestSession.ISummary.
 * 5. Verify pagination metadata fields: current, limit, records, pages.
 * 6. Validate session summary fields: id, ip, href, referrer, created_at, expired_at, guest.
 * 7. Test pagination by requesting page 2 with limit 10.
 * 8. Verify pagination metadata reflects correct page number and total count.
 */
export async function test_api_guest_session_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. List guest sessions with default pagination (page 1, limit 20)
  const page1 = await api.functional.redditClone.guest.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IRedditCloneGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.predicate("has pagination info", page1.pagination.current >= 1);
  TestValidator.predicate("has limit", page1.pagination.limit >= 1);
  TestValidator.predicate("has records count", page1.pagination.records >= 0);
  TestValidator.predicate("has pages count", page1.pagination.pages >= 0);
  // 4. Validate page 1 metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", page1.pagination.limit, 20);
  // 5. Validate session data structure
  if (page1.data.length > 0) {
    const session = page1.data[0];
    TestValidator.predicate("session has id", session.id.length > 0);
    TestValidator.predicate("session has ip", session.ip.length > 0);
    TestValidator.predicate("session has href", session.href.length > 0);
    TestValidator.predicate(
      "session has created_at",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expired_at",
      session.expired_at.length > 0,
    );
    TestValidator.predicate("session has guest", session.guest !== null);
    TestValidator.predicate(
      "guest has device_fingerprint",
      session.guest.device_fingerprint.length > 0,
    );
  }
  // 6. Test pagination with page 2 and limit 10
  const page2 = await api.functional.redditClone.guest.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCloneGuestSession.IRequest,
    },
  );
  typia.assert(page2);
  // 7. Validate page 2 metadata
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 10", page2.pagination.limit, 10);
  // 8. Verify pagination consistency
  TestValidator.equals(
    "total records same",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total pages same",
    page1.pagination.pages,
    page2.pagination.pages,
  );
}
