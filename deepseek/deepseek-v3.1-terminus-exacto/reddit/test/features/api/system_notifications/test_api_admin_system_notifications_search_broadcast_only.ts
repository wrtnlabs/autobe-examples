import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_system_notifications_search_broadcast_only(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Search for broadcast notifications only
  const searchResult =
    await api.functional.communityPlatform.admin.system_notifications.index(
      adminConnection,
      {
        body: {
          is_broadcast: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSystemNotification.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure and broadcast flag
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  for (const notification of searchResult.data) {
    typia.assert(notification);
    // Verify all notifications are broadcast notifications
    TestValidator.equals(
      "notification is broadcast",
      notification.is_broadcast,
      true,
    );
    // Validate required fields exist and have proper types
    TestValidator.predicate(
      "has valid UUID id",
      typeof notification.id === "string" && notification.id.length > 0,
    );
    TestValidator.predicate(
      "has notification type",
      typeof notification.notification_type === "string" &&
        notification.notification_type.length > 0,
    );
    TestValidator.predicate(
      "has title",
      typeof notification.title === "string" && notification.title.length > 0,
    );
    TestValidator.predicate(
      "has priority",
      typeof notification.priority === "string" &&
        notification.priority.length > 0,
    );
    TestValidator.predicate(
      "has status",
      typeof notification.status === "string" && notification.status.length > 0,
    );
    TestValidator.predicate(
      "has creation timestamp",
      typeof notification.created_at === "string" &&
        notification.created_at.length > 0,
    );
  }
}
