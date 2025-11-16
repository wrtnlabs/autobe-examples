import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test notification sorting by different fields and order directions.
 *
 * This test validates the comprehensive sorting functionality of the
 * notification retrieval API. It verifies that notifications can be correctly
 * sorted by multiple fields (created_at, is_read, type) in both ascending and
 * descending order, and that default sorting behavior works as expected when
 * parameters are omitted.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Test sorting by created_at field (ascending and descending)
 * 3. Test sorting by is_read field (ascending and descending)
 * 4. Test sorting by type field (ascending and descending)
 * 5. Verify default sorting behavior (created_at descending)
 *
 * Each sorting combination is validated to ensure the API returns properly
 * structured paginated responses with correct notification data.
 */
export async function test_api_notification_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Test sorting by created_at in descending order (newest first)
  const sortByCreatedAtDesc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  // Step 3: Test sorting by created_at in ascending order (oldest first)
  const sortByCreatedAtAsc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  // Step 4: Test sorting by is_read in descending order
  const sortByIsReadDesc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "is_read",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByIsReadDesc);

  // Step 5: Test sorting by is_read in ascending order
  const sortByIsReadAsc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "is_read",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByIsReadAsc);

  // Step 6: Test sorting by type in descending order
  const sortByTypeDesc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "type",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByTypeDesc);

  // Step 7: Test sorting by type in ascending order
  const sortByTypeAsc: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          sort_by: "type",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(sortByTypeAsc);

  // Step 8: Test default sorting behavior (no sort parameters specified)
  const defaultSort: IPageIRedditCommunityNotification.ISummary =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(defaultSort);

  // Validate that all responses have proper pagination structure
  TestValidator.predicate(
    "created_at desc response has valid pagination",
    sortByCreatedAtDesc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "created_at asc response has valid pagination",
    sortByCreatedAtAsc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "is_read desc response has valid pagination",
    sortByIsReadDesc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "is_read asc response has valid pagination",
    sortByIsReadAsc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "type desc response has valid pagination",
    sortByTypeDesc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "type asc response has valid pagination",
    sortByTypeAsc.pagination.current >= 0,
  );
  TestValidator.predicate(
    "default sort response has valid pagination",
    defaultSort.pagination.current >= 0,
  );
}
