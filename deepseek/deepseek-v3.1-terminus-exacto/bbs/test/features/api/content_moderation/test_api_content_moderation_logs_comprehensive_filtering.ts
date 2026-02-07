import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_moderation_logs_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple administrator connections
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Note: In a real implementation, we would need to create actual content
  // and perform moderation actions to generate logs. Since the content creation
  // APIs are not available in the provided SDK, we'll test the filtering
  // functionality with the existing data in the system.
  // Test various filter combinations with the available data
  // Test 1: Filter by specific administrator
  const admin1Filtered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          admin_id: admin1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(admin1Filtered);
  // Test 2: Filter by action type
  const actionTypeFiltered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          action_type: "article_delete",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeFiltered);
  // Test 3: Filter by target content type
  const contentTypeFiltered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          target_content_type: "article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(contentTypeFiltered);
  // Test 4: Filter by date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeFiltered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          created_at_from: yesterday,
          created_at_to: tomorrow,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Test 5: Text search in reason field
  const searchFiltered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(searchFiltered);
  // Test 6: Combined filters
  const combinedFiltered =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          admin_id: admin1.id,
          action_type: "article_delete",
          target_content_type: "article",
          created_at_from: yesterday,
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Test 7: Pagination validation
  const paginationTest =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure using business logic validation
  TestValidator.predicate(
    "pagination has valid current page",
    paginationTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    paginationTest.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records count",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages count",
    paginationTest.pagination.pages >= 0,
  );
  // Validate that pagination calculations are correct
  if (paginationTest.pagination.records > 0) {
    const expectedPages = Math.ceil(
      paginationTest.pagination.records / paginationTest.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      paginationTest.pagination.pages,
      expectedPages,
    );
  }
  // Test 8: Empty filter (get all logs)
  const allLogs =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(allLogs);
  // Test 9: Null filter values
  const nullFilters =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          admin_id: null,
          action_type: null,
          target_content_type: null,
          created_at_from: null,
          created_at_to: null,
          search: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(nullFilters);
  // Test 10: Different page and limit combinations
  const smallPage =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(smallPage);
  const largePage =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(largePage);
}
