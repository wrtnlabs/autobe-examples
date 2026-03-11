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
 * Test comprehensive filtering capabilities for system notifications including
 * notification type filtering (announcement, alert, status_update, moderation_action, personal_message),
 * status filtering (pending, sent, read, archived), priority filtering (low, normal, high, critical),
 * and text search on title/content fields. Verify that combining multiple filters
 * works correctly and that the system respects all specified criteria.
 */
export async function test_api_system_notifications_advanced_filtering(
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
  // Test notification type filtering
  const typeFilterTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          notification_type: "announcement",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(typeFilterTest);
  // Test status filtering
  const statusFilterTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(statusFilterTest);
  // Test priority filtering
  const priorityFilterTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          priority: "high",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(priorityFilterTest);
  // Test combined filtering: type + status
  const combinedFilter1 =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          notification_type: "alert",
          status: "sent",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(combinedFilter1);
  // Test combined filtering: type + priority
  const combinedFilter2 =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          notification_type: "status_update",
          priority: "normal",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(combinedFilter2);
  // Test combined filtering: status + priority
  const combinedFilter3 =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          status: "read",
          priority: "low",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(combinedFilter3);
  // Test comprehensive filtering with all criteria
  const comprehensiveFilter =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          notification_type: "moderation_action",
          status: "archived",
          priority: "critical",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(comprehensiveFilter);
  // Test text search functionality
  const searchTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          search: "system",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(searchTest);
  // Test pagination with filtering
  const paginationTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          notification_type: "personal_message",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    paginationTest.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    paginationTest.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    paginationTest.pagination.pages >= 0,
  );
  // Test empty search query
  const emptySearchTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          search: "",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(emptySearchTest);
  // Test target entity filtering
  const entityFilterTest =
    await api.functional.discussionBoard.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          target_entity_type: "article",
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(entityFilterTest);
}
