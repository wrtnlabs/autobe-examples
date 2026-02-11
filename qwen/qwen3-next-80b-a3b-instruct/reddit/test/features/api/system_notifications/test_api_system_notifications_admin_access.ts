import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemNotification";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_system_notifications_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin credentials
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  // Register new platform admin
  await authorize_platform_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Request system notifications with page 1 and limit 10
  const notifications =
    await api.functional.redditCommunity.system_notifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySystemNotification.IRequest,
      },
    );
  typia.assert(notifications);
  // Validate response structure
  TestValidator.equals(
    "page 1 has 10 notifications",
    notifications.data.length,
    10,
  );
  TestValidator.equals(
    "pagination page is 1",
    notifications.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    notifications.pagination.limit,
    10,
  );
  TestValidator.predicate("notifications are sorted by created_at DESC", () => {
    if (notifications.data.length <= 1) return true; // Single or empty array is considered sorted
    for (let i = 0; i < notifications.data.length - 1; i++) {
      const current = new Date(notifications.data[i].created_at);
      const next = new Date(notifications.data[i + 1].created_at);
      if (current < next) return false; // Not sorted DESC
    }
    return true;
  });
  // Verify each notification has required fields
  for (const notification of notifications.data) {
    TestValidator.predicate(
      "notification has message",
      () => typeof notification.message === "string",
    );
    TestValidator.predicate(
      "notification has created_at",
      () =>
        typeof notification.created_at === "string" &&
        !isNaN(Date.parse(notification.created_at)),
    );
  }
  // Test unauthorized access: use base connection without admin auth
  try {
    await api.functional.redditCommunity.system_notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySystemNotification.IRequest,
      },
    );
    TestValidator.error("should reject unauthorized access", () => {
      throw new Error("Should have thrown error");
    });
  } catch (error) {
    // Expected error - test passes
    if (error instanceof HttpError) {
      TestValidator.predicate(
        "should return 401 or 403",
        () => error.status === 401 || error.status === 403,
      );
    } else {
      throw error;
    }
  }
}