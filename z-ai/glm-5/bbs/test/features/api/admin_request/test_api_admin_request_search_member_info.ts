import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the admin request listing endpoint with text search on member
 * information and date range filtering.
 *
 * Scenario: A member searches for admin requests by member display name
 * and date range to verify filtering capabilities.
 */
export async function test_api_admin_request_search_member_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      displayName: "SearchTest User " + RandomGenerator.alphaNumeric(4),
    },
  });
  typia.assert(member);
  // 2. Test basic listing (no filters)
  const basicResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(basicResult);
  // 3. Test search by display name - search for part of the created member's name
  const searchDisplayName =
    member.displayName.length > 4
      ? member.displayName.substring(
          0,
          Math.min(8, Math.floor(member.displayName.length / 2)),
        )
      : member.displayName;
  const resultByDisplayName =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          search: searchDisplayName,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(resultByDisplayName);
  // Verify that all results have member displayName containing the search term (case-insensitive)
  for (const item of resultByDisplayName.data) {
    TestValidator.predicate(
      "display name contains search term",
      item.member.displayName
        .toLowerCase()
        .includes(searchDisplayName.toLowerCase()),
    );
  }
  // 4. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const resultByDateRange =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(resultByDateRange);
  // Verify results fall within date range (inclusive)
  for (const item of resultByDateRange.data) {
    const createdAt = new Date(item.created_at);
    TestValidator.predicate(
      "created_at within range",
      createdAt.getTime() >= oneWeekAgo.getTime() &&
        createdAt.getTime() <= oneDayLater.getTime(),
    );
  }
  // 5. Test combined filters - search + date range
  const resultCombined =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          search: searchDisplayName,
          created_at_from: oneWeekAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(resultCombined);
  // Verify combined filter results
  for (const item of resultCombined.data) {
    TestValidator.predicate(
      "display name contains search term in combined result",
      item.member.displayName
        .toLowerCase()
        .includes(searchDisplayName.toLowerCase()),
    );
    const createdAt = new Date(item.created_at);
    TestValidator.predicate(
      "created_at within range in combined result",
      createdAt.getTime() >= oneWeekAgo.getTime() &&
        createdAt.getTime() <= oneDayLater.getTime(),
    );
  }
  // 6. Test sorting - ascending by created_at
  const resultAsc =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          sort: "created_at",
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(resultAsc);
  // Verify ascending order
  for (let i = 1; i < resultAsc.data.length; i++) {
    const prevDate = new Date(resultAsc.data[i - 1].created_at);
    const currDate = new Date(resultAsc.data[i].created_at);
    TestValidator.predicate(
      "ascending order by created_at",
      prevDate.getTime() <= currDate.getTime(),
    );
  }
  // 7. Test sorting - descending by created_at (default behavior)
  const resultDesc =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          sort: "-created_at",
          limit: 20,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(resultDesc);
  // Verify descending order
  for (let i = 1; i < resultDesc.data.length; i++) {
    const prevDate = new Date(resultDesc.data[i - 1].created_at);
    const currDate = new Date(resultDesc.data[i].created_at);
    TestValidator.predicate(
      "descending order by created_at",
      prevDate.getTime() >= currDate.getTime(),
    );
  }
  // 8. Test pagination
  const page1 =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 data length", page1.data.length <= 5);
  // Test page 2 if there are enough records
  if (page1.pagination.records > 5) {
    const page2 =
      await api.functional.discussionBoard.member.admin_requests.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardAdminRequest.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.predicate(
      "pages have different data",
      page1.data.length === 0 ||
        page2.data.length === 0 ||
        page1.data[0].id !== page2.data[0].id,
    );
  }
  // 9. Test status filter
  const pendingResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  for (const item of pendingResult.data) {
    TestValidator.equals("status is pending", item.status, "pending");
  }
}
