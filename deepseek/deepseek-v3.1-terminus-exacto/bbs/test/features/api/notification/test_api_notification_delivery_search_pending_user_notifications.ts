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

export async function test_api_notification_delivery_search_pending_user_notifications(
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
  // Search for pending notifications targeting users
  const searchRequest = {
    status: "pending",
    target_entity_type: "user",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemNotification.IRequest;
  const response =
    await api.functional.discussionBoard.superAdmin.notifications.delivery.index(
      superAdminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination structure",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  // Validate all notifications have pending status and null delivered_at
  for (const notification of response.data) {
    TestValidator.equals(
      "notification status is pending",
      notification.status,
      "pending",
    );
    TestValidator.equals(
      "delivered_at is null for pending notifications",
      notification.delivered_at,
      null,
    );
  }
  // Test pagination with different page
  const page2Request = {
    status: "pending",
    target_entity_type: "user",
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardSystemNotification.IRequest;
  const page2Response =
    await api.functional.discussionBoard.superAdmin.notifications.delivery.index(
      superAdminConnection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
}
