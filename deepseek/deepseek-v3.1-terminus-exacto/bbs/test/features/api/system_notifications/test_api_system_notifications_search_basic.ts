import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic search functionality for system notifications with minimal filtering criteria.
 * Verify that administrators can retrieve a paginated list of notifications with default parameters.
 */
export async function test_api_system_notifications_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Perform basic search with minimal parameters
  const searchResult =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          // Use default pagination (page 1, limit 10)
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
  );
  // Validate notification summaries if data exists
  if (searchResult.data.length > 0) {
    const notification = searchResult.data[0];
    TestValidator.predicate(
      "notification has id",
      notification.id !== undefined,
    );
    TestValidator.predicate(
      "notification has title",
      notification.title !== undefined,
    );
    TestValidator.predicate(
      "notification has type",
      notification.notification_type !== undefined,
    );
    TestValidator.predicate(
      "notification has status",
      notification.status !== undefined,
    );
    TestValidator.predicate(
      "notification has priority",
      notification.priority !== undefined,
    );
    TestValidator.predicate(
      "notification has created_at",
      notification.created_at !== undefined,
    );
    // typia.assert() already validates all format constraints including date-time
    // No need for redundant validation checks
  }
}
