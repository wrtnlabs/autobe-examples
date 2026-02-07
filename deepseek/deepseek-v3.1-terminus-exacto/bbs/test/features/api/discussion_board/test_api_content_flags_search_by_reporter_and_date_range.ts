import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test content flag search by reporter and date range filtering.
 *
 * This test verifies that administrators can search for content flags submitted by
 * a specific reporter within a specified date range. Due to missing API functions
 * for creating content flags, this test focuses on validating that the search
 * endpoint responds correctly to the filtering parameters without testing actual
 * data filtering behavior.
 */
export async function test_api_content_flags_search_by_reporter_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create test reporter UUID
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  // Create date range for filtering
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(now.getTime() - oneDayMs).toISOString();
  const tomorrow = new Date(now.getTime() + oneDayMs).toISOString();
  // Search for flags by specific reporter within date range
  const searchRequest = {
    reporter_user_id: reporterId,
    created_at_min: yesterday,
    created_at_max: tomorrow,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardContentFlag.IRequest;
  const searchResult =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure is an array
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  // Note: Without the ability to create content flags, we cannot test the actual
  // filtering behavior. This test validates that the API endpoint responds
  // correctly to the search parameters and returns properly structured data.
}
