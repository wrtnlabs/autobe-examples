import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve a filtered and paginated list of ban records.
 * Verifies filtering by actor_type, status, date range, and text search on ban_reason.
 * Validates pagination metadata and response structure including bannedBy administrator information.
 */
export async function test_api_ban_record_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Test basic retrieval with no filters
  const basicResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(basicResponse);
  // Validate pagination metadata exists
  TestValidator.predicate(
    "has pagination",
    basicResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    basicResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    basicResponse.pagination.pages >= 0,
  );
  // 3. Test filtering by actor_type (member)
  const memberFilterResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(memberFilterResponse);
  // All results should have actor_type = "member"
  for (const record of memberFilterResponse.data) {
    TestValidator.equals("actor_type is member", record.actor_type, "member");
  }
  // 4. Test filtering by actor_type (administrator)
  const adminFilterResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          actor_type: "administrator",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(adminFilterResponse);
  // All results should have actor_type = "administrator"
  for (const record of adminFilterResponse.data) {
    TestValidator.equals(
      "actor_type is administrator",
      record.actor_type,
      "administrator",
    );
  }
  // 5. Test filtering by status (active)
  const activeStatusResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(activeStatusResponse);
  // All active bans should have unbanned_at = null
  for (const record of activeStatusResponse.data) {
    TestValidator.equals(
      "active ban has null unbanned_at",
      record.unbanned_at,
      null,
    );
  }
  // 6. Test filtering by status (lifted)
  const liftedStatusResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          status: "lifted",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(liftedStatusResponse);
  // All lifted bans should have unbanned_at !== null
  for (const record of liftedStatusResponse.data) {
    TestValidator.predicate(
      "lifted ban has unbanned_at",
      record.unbanned_at !== null,
    );
  }
  // 7. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          banned_at_from: yesterday.toISOString(),
          banned_at_to: tomorrow.toISOString(),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // All records should be within the date range
  for (const record of dateRangeResponse.data) {
    const bannedAt = new Date(record.banned_at);
    TestValidator.predicate(
      "banned_at is after from date",
      bannedAt >= yesterday,
    );
    TestValidator.predicate(
      "banned_at is before to date",
      bannedAt <= tomorrow,
    );
  }
  // 8. Test text search on ban_reason
  const searchTerm = "violation";
  const searchResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchResponse);
  // All results should contain the search term (case-insensitive)
  for (const record of searchResponse.data) {
    TestValidator.predicate(
      "ban_reason contains search term",
      record.ban_reason.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 9. Test pagination with specific page and limit
  const paginatedResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "current page matches request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 10,
  );
  // 10. Test empty results return valid pagination
  const emptySearchResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          search: "this_unique_search_term_will_not_match_anything_x9k2m",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty results have zero records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results have zero pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results have empty data array",
    emptySearchResponse.data.length,
    0,
  );
  // 11. Verify bannedBy field contains administrator summary
  if (basicResponse.data.length > 0) {
    const firstRecord = basicResponse.data[0];
    TestValidator.predicate(
      "bannedBy exists",
      firstRecord.bannedBy !== undefined,
    );
    TestValidator.predicate(
      "bannedBy has id",
      firstRecord.bannedBy.id !== undefined,
    );
    TestValidator.predicate(
      "bannedBy has email",
      firstRecord.bannedBy.email !== undefined,
    );
    TestValidator.predicate(
      "bannedBy has grade",
      firstRecord.bannedBy.grade !== undefined,
    );
    TestValidator.predicate(
      "bannedBy has created_at",
      firstRecord.bannedBy.created_at !== undefined,
    );
    TestValidator.predicate(
      "bannedBy has updated_at",
      firstRecord.bannedBy.updated_at !== undefined,
    );
  }
  // 12. Verify default sorting (banned_at descending)
  if (basicResponse.data.length > 1) {
    for (let i = 1; i < basicResponse.data.length; i++) {
      const prevDate = new Date(basicResponse.data[i - 1].banned_at);
      const currDate = new Date(basicResponse.data[i].banned_at);
      TestValidator.predicate(
        `records are sorted by banned_at descending at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
