import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session pagination and sorting functionality.
 * 1. Guest authenticates successfully
 * 2. Guest retrieves page 1 with default limit (20 records)
 * 3. Guest retrieves page 2 with custom limit (50 records)
 * 4. Guest sorts results by created_at descending (default)
 * 5. Guest sorts results by created_at ascending
 * 6. Guest sorts results by expired_at descending
 * 7. Guest sorts results by expired_at ascending
 * 8. Pagination metadata correctly reflects current page, total records, and total pages
 * 9. Requesting a page beyond available data returns empty data array with correct pagination metadata
 */
export async function test_api_guest_session_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Retrieve page 1 with default limit (20 records)
  const page1 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 has data or valid pagination",
    page1.pagination.records >= 0,
  );
  // 3. Retrieve page 2 with custom limit (50 records)
  const page2 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 50,
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 50);
  // 4. Sort by created_at descending (default)
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        sort: "created_at",
        order: "desc",
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);
  TestValidator.equals(
    "sort created_at desc current page",
    sortByCreatedAtDesc.pagination.current,
    1,
  );
  // 5. Sort by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        sort: "created_at",
        order: "asc",
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);
  TestValidator.equals(
    "sort created_at asc current page",
    sortByCreatedAtAsc.pagination.current,
    1,
  );
  // 6. Sort by expired_at descending
  const sortByExpiredAtDesc =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        sort: "expired_at",
        order: "desc",
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(sortByExpiredAtDesc);
  TestValidator.equals(
    "sort expired_at desc current page",
    sortByExpiredAtDesc.pagination.current,
    1,
  );
  // 7. Sort by expired_at ascending
  const sortByExpiredAtAsc =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        sort: "expired_at",
        order: "asc",
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(sortByExpiredAtAsc);
  TestValidator.equals(
    "sort expired_at asc current page",
    sortByExpiredAtAsc.pagination.current,
    1,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  TestValidator.predicate(
    "page 2 pages calculated correctly",
    page2.pagination.pages ===
      Math.ceil(page2.pagination.records / page2.pagination.limit),
  );
  // 9. Request page beyond available data
  const beyondPage = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 9999,
        limit: 10,
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    9999,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 10);
  TestValidator.equals("beyond page data is empty", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page metadata valid",
    beyondPage.pagination.records >= 0 && beyondPage.pagination.pages >= 0,
  );
}
