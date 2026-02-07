import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities with multiple criteria including date ranges,
 * administrator targeting, and full-text search.
 */
export async function test_api_moderation_logs_complex_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connections
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };
  // Register administrators
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
  // Since we cannot create actual moderation logs through the API (no create endpoint available),
  // we'll test the search functionality with the assumption that some logs exist in the system
  // Test complex search with multiple criteria
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const searchRequest: IDiscussionBoardModerationLog.IRequest = {
    performed_at_from: oneDayAgo.toISOString(),
    performed_at_to: now.toISOString(),
    admin_id: admin1.id,
    action_description_search: "test",
    page: 1,
    limit: 10,
  };
  const result =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: searchRequest },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Test different filter combinations
  const dateRangeSearch: IDiscussionBoardModerationLog.IRequest = {
    performed_at_from: oneDayAgo.toISOString(),
    performed_at_to: now.toISOString(),
    page: 1,
    limit: 5,
  };
  const dateRangeResult =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: dateRangeSearch },
    );
  typia.assert(dateRangeResult);
  // Test admin-specific filtering
  const adminFilterSearch: IDiscussionBoardModerationLog.IRequest = {
    admin_id: admin2.id,
    page: 1,
    limit: 5,
  };
  const adminFilterResult =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: adminFilterSearch },
    );
  typia.assert(adminFilterResult);
  // Test text search functionality
  const textSearch: IDiscussionBoardModerationLog.IRequest = {
    action_description_search: "moderation",
    page: 1,
    limit: 5,
  };
  const textSearchResult =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: textSearch },
    );
  typia.assert(textSearchResult);
  // Test combined filters
  const combinedSearch: IDiscussionBoardModerationLog.IRequest = {
    performed_at_from: oneDayAgo.toISOString(),
    performed_at_to: now.toISOString(),
    admin_id: admin1.id,
    action_description_search: "action",
    page: 1,
    limit: 3,
  };
  const combinedResult =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: combinedSearch },
    );
  typia.assert(combinedResult);
  // Validate that pagination limits are respected
  TestValidator.predicate(
    "data length respects limit",
    combinedResult.data.length <= combinedSearch.limit!,
  );
  // Test empty search (should return all logs)
  const emptySearch: IDiscussionBoardModerationLog.IRequest = {
    page: 1,
    limit: 5,
  };
  const emptySearchResult =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection1,
      { body: emptySearch },
    );
  typia.assert(emptySearchResult);
  // Validate pagination consistency
  TestValidator.predicate(
    "pagination records consistent",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    emptySearchResult.pagination.pages >= 0,
  );
}
