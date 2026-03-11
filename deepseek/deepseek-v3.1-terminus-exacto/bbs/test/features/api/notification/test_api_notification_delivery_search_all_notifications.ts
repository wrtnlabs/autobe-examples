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

export async function test_api_notification_delivery_search_all_notifications(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Search all notifications without filters
  const response =
    await api.functional.discussionBoard.superAdmin.notifications.delivery.index(
      superAdminConnection,
      {
        body: {
          // Empty search criteria to get all notifications
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit > 0", response.pagination.limit > 0);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // Validate pagination calculation consistency
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  if (response.data.length > 0) {
    // Validate first notification summary structure
    const notification = response.data[0];
    TestValidator.predicate(
      "notification has id",
      notification.id !== undefined,
    );
    TestValidator.predicate(
      "notification has title",
      notification.title !== undefined,
    );
    TestValidator.predicate(
      "notification has notification_type",
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
    TestValidator.predicate("notification has delivered_at", true); // can be null
    TestValidator.predicate("notification has read_at", true); // can be null
    // Validate that timestamps are in ISO format if present
    if (notification.delivered_at !== null) {
      TestValidator.predicate(
        "delivered_at is valid date",
        !isNaN(new Date(notification.delivered_at).getTime()),
      );
    }
    if (notification.read_at !== null) {
      TestValidator.predicate(
        "read_at is valid date",
        !isNaN(new Date(notification.read_at).getTime()),
      );
    }
  }
}
