import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_bans_dashboard_filtered_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Test 1: Filter by active status only
  const activeBansRequest: IDiscussionBoardUserBan.IRequest = {
    status: "active",
    page: 1,
    limit: 10,
  };
  const activeBansResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: activeBansRequest },
    );
  typia.assert(activeBansResponse);
  // Validate that all returned bans have active status
  for (const ban of activeBansResponse.data) {
    TestValidator.equals("ban status should be active", ban.status, "active");
  }
  // Test 2: Filter by date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeRequest: IDiscussionBoardUserBan.IRequest = {
    banned_at_from: yesterday,
    banned_at_to: tomorrow,
    page: 1,
    limit: 10,
  };
  const dateRangeResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // Validate that bans are within the date range using ISO string comparison
  for (const ban of dateRangeResponse.data) {
    TestValidator.predicate(
      "ban date should be within range",
      ban.banned_at >= yesterday && ban.banned_at <= tomorrow,
    );
  }
  // Test 3: Filter by expired status
  const expiredBansRequest: IDiscussionBoardUserBan.IRequest = {
    status: "expired",
    page: 1,
    limit: 10,
  };
  const expiredBansResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: expiredBansRequest },
    );
  typia.assert(expiredBansResponse);
  // Validate that all returned bans have expired status
  for (const ban of expiredBansResponse.data) {
    TestValidator.equals("ban status should be expired", ban.status, "expired");
  }
  // Test 4: Filter by removed status
  const removedBansRequest: IDiscussionBoardUserBan.IRequest = {
    status: "removed",
    page: 1,
    limit: 10,
  };
  const removedBansResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: removedBansRequest },
    );
  typia.assert(removedBansResponse);
  // Validate that all returned bans have removed status
  for (const ban of removedBansResponse.data) {
    TestValidator.equals("ban status should be removed", ban.status, "removed");
  }
  // Test 5: Filter by reason text using partial matching
  const reasonFilterRequest: IDiscussionBoardUserBan.IRequest = {
    reason: "spam",
    page: 1,
    limit: 10,
  };
  const reasonFilterResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: reasonFilterRequest },
    );
  typia.assert(reasonFilterResponse);
  // Validate that ban reasons contain the search text
  for (const ban of reasonFilterResponse.data) {
    TestValidator.predicate(
      "ban reason should contain search text",
      ban.reason.toLowerCase().includes("spam"),
    );
  }
  // Test 6: Combined filter - active bans within date range
  const combinedRequest: IDiscussionBoardUserBan.IRequest = {
    status: "active",
    banned_at_from: yesterday,
    banned_at_to: tomorrow,
    page: 1,
    limit: 10,
  };
  const combinedResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: combinedRequest },
    );
  typia.assert(combinedResponse);
  // Validate combined filter criteria
  for (const ban of combinedResponse.data) {
    TestValidator.equals("ban status should be active", ban.status, "active");
    TestValidator.predicate(
      "ban date should be within range",
      ban.banned_at >= yesterday && ban.banned_at <= tomorrow,
    );
  }
  // Test 7: Pagination validation
  const paginationRequest: IDiscussionBoardUserBan.IRequest = {
    page: 2,
    limit: 5,
  };
  const paginationResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should match",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should match",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    paginationResponse.pagination.pages >= 0,
  );
  // Test 8: Empty result scenario
  const farFutureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyRequest: IDiscussionBoardUserBan.IRequest = {
    banned_at_from: farFutureDate,
    page: 1,
    limit: 10,
  };
  const emptyResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response should have zero data",
    emptyResponse.data.length,
    0,
  );
}
