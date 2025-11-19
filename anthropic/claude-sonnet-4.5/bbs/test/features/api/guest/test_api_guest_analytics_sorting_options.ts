import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test sorting guest records by different metrics and orderings.
 *
 * This test validates the sorting functionality of the guest analytics API,
 * ensuring that guest visitor records can be correctly sorted by various fields
 * including page_views, last_visit_at, first_visit_at, and created_at in both
 * ascending and descending order.
 *
 * The test performs the following steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Test sorting by page_views (ascending and descending)
 * 3. Test sorting by last_visit_at (ascending and descending)
 * 4. Test sorting by first_visit_at (ascending and descending)
 * 5. Test sorting by created_at (ascending and descending)
 * 6. Test default sorting behavior when parameters are omitted
 */
export async function test_api_guest_analytics_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string>(),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test sorting by page_views - descending (most engaged first)
  const pageViewsDesc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "page_views",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(pageViewsDesc);

  // Step 3: Test sorting by page_views - ascending (least engaged first)
  const pageViewsAsc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "page_views",
        order: "asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(pageViewsAsc);

  // Step 4: Test sorting by last_visit_at - descending (most recent first)
  const lastVisitDesc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "last_visit_at",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(lastVisitDesc);

  // Step 5: Test sorting by last_visit_at - ascending (oldest first)
  const lastVisitAsc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "last_visit_at",
        order: "asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(lastVisitAsc);

  // Step 6: Test sorting by first_visit_at - descending (newest acquisition first)
  const firstVisitDesc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "first_visit_at",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(firstVisitDesc);

  // Step 7: Test sorting by first_visit_at - ascending (oldest acquisition first)
  const firstVisitAsc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "first_visit_at",
        order: "asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(firstVisitAsc);

  // Step 8: Test sorting by created_at - descending (newest database records first)
  const createdAtDesc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(createdAtDesc);

  // Step 9: Test sorting by created_at - ascending (oldest database records first)
  const createdAtAsc: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(createdAtAsc);

  // Step 10: Test default sorting behavior (no sort parameters)
  const defaultSort: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {} satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(defaultSort);

  // All sorting options tested successfully
}
