import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test user statistics retrieval when no users match the search criteria.
 * This scenario validates the system's behavior when filtering parameters
 * result in zero matching records. Test with non-matching search terms,
 * specific email filters that don't exist, and verify that the response
 * correctly returns empty data array with proper pagination metadata
 * showing zero records.
 */
export async function test_api_admin_user_statistics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test with non-matching email filter
  const statisticsResponse =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          search: "nonexistent_user_search_term_12345",
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(statisticsResponse);
  // Validate empty results - only test business logic, not types
  TestValidator.equals("empty data array", statisticsResponse.data.length, 0);
  TestValidator.equals(
    "zero total records",
    statisticsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages",
    statisticsResponse.pagination.pages,
    0,
  );
  // Test with null email filter
  const nullEmailResponse =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          email: null,
          search: "another_nonexistent_term",
          page: 1,
          limit: 5,
          sort: "oldest",
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(nullEmailResponse);
  // Validate empty results for null email filter
  TestValidator.equals(
    "null email empty data",
    nullEmailResponse.data.length,
    0,
  );
  TestValidator.equals(
    "null email zero records",
    nullEmailResponse.pagination.records,
    0,
  );
}
