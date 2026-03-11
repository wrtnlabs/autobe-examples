import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive notification search functionality for super administrators.
 * Validate that super admins can search notifications by type, status, priority,
 * and text content with proper pagination support.
 */
export async function test_api_system_notifications_superadmin_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test basic search with empty filters
  const basicSearch =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(basicSearch);
  // 3. Test individual filter types
  const notificationTypes = [
    "announcement",
    "alert",
    "status_update",
    "moderation_action",
    "personal_message",
  ] as const;
  const statusTypes = ["pending", "sent", "read", "archived"] as const;
  const priorityTypes = ["low", "normal", "high", "critical"] as const;
  // Test notification type filter
  const notificationType =
    notificationTypes[
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<4>
      >()
    ];
  const typeFiltered =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          notification_type: notificationType,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(typeFiltered);
  // Test status filter
  const status =
    statusTypes[
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
      >()
    ];
  const statusFiltered =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          status: status,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(statusFiltered);
  // Test priority filter
  const priority =
    priorityTypes[
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
      >()
    ];
  const priorityFiltered =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          priority: priority,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(priorityFiltered);
  // 4. Test text search functionality
  const searchText = RandomGenerator.paragraph({ sentences: 1 });
  const textSearch =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          search: searchText,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(textSearch);
  // 5. Test pagination with different page sizes
  const pageSizes = [10, 25, 50] as const;
  const pageSize =
    pageSizes[
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<2>
      >()
    ];
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSearch.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedSearch.pagination.pages >= 0,
  );
  // 6. Test filter combinations
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          notification_type:
            notificationTypes[
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<4>
              >()
            ],
          status:
            statusTypes[
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
              >()
            ],
          priority:
            priorityTypes[
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
              >()
            ],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(combinedFilter);
}
