import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_retrieve_default_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  // 2. Call the notifications retrieval endpoint with default pagination, no filters
  const response =
    await api.functional.shoppingMall.administrator.notifications.index(
      adminConnection,
      {
        body: {
          // Default pagination: page 1, default limit handled by backend
          // No filters
        } satisfies IShoppingMallUserNotification.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination object
  TestValidator.predicate(
    "has pagination object",
    response.pagination !== null && typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. All notifications belong to this administrator
  for (const notification of response.data) {
    typia.assert(notification);
    TestValidator.equals(
      "notification ownerType",
      notification.ownerType,
      "administrator",
    );
    // The notification id and notificationTemplateId are UUIDs, typia.assert covers this, so no extra checks
  }
  // 6. Verify sorting by createdAt descending
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1];
    const curr = response.data[i];
    TestValidator.predicate(
      `sorted by createdAt desc between index ${i - 1} and ${i}`,
      new Date(prev.createdAt) >= new Date(curr.createdAt),
    );
  }
  // 7. Check unauthorized access rejected - separate connection without token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.shoppingMall.administrator.notifications.index(
      unauthorizedConnection,
      {
        body: {},
      },
    );
  });
}
