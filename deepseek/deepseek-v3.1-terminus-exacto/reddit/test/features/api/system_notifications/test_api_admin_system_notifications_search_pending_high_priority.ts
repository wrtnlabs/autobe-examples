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

export async function test_api_admin_system_notifications_search_pending_high_priority(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Since authorize_admin_join utility function may not be imported in the template scope,
  // and we cannot add imports, we use the SDK directly while following the same pattern.
  // The utility function would internally call this same SDK endpoint.
  const joinResult = await api.functional.communityPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        permissions_level: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(joinResult);
  // Update connection headers with token as the utility function would do
  adminConnection.headers = { Authorization: joinResult.token.access };
  // Step 2: Search for pending high priority notifications
  const searchBody: ICommunityPlatformSystemNotification.IRequest = {
    status: "pending",
    priority: "high",
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number,
  };
  const response: IPageICommunityPlatformSystemNotification.ISummary =
    await api.functional.communityPlatform.admin.system_notifications.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(response);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    () => response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation correct",
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );
  } else {
    TestValidator.predicate(
      "zero records means zero pages",
      response.pagination.pages === 0,
    );
  }
  // Step 4: Validate all returned notifications match criteria
  for (const notification of response.data) {
    TestValidator.equals(
      "notification status is pending",
      notification.status,
      "pending",
    );
    TestValidator.predicate(
      "priority is high",
      notification.priority === "high",
    );
  }
  // Step 5: Additional test with priority 'urgent'
  const urgentSearchBody: ICommunityPlatformSystemNotification.IRequest = {
    status: "pending",
    priority: "urgent",
    page: 1 satisfies number,
    limit: 10 satisfies number,
  };
  const urgentResponse: IPageICommunityPlatformSystemNotification.ISummary =
    await api.functional.communityPlatform.admin.system_notifications.index(
      adminConnection,
      { body: urgentSearchBody },
    );
  typia.assert(urgentResponse);
  // Validate urgent response
  for (const notification of urgentResponse.data) {
    TestValidator.equals(
      "urgent notification status is pending",
      notification.status,
      "pending",
    );
    TestValidator.equals(
      "urgent notification priority is urgent",
      notification.priority,
      "urgent",
    );
  }
}
