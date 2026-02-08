import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_logs_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);
  // Set Authorization header for authenticated requests
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Fetch notification logs without explicit pagination parameters
  const result =
    await api.functional.shoppingMall.administrator.notifications.logs.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // Validate pagination metadata properties
  TestValidator.predicate(
    "current page is number",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof result.pagination.pages === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof result.pagination.records === "number",
  );
  // Validate logical consistency of pagination data
  TestValidator.predicate(
    "current page is within total pages",
    result.pagination.current >= 1 &&
      result.pagination.current <= result.pagination.pages,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "pages equals Math.ceil(records / limit)",
    result.pagination.pages ===
      (result.pagination.limit > 0
        ? Math.ceil(result.pagination.records / result.pagination.limit)
        : 0),
  );
  TestValidator.predicate(
    "data length <= limit",
    result.data.length <= result.pagination.limit,
  );
  // If current page is less than total pages, data length should be equal to limit
  if (result.pagination.current < result.pagination.pages) {
    TestValidator.equals(
      "data length equals limit",
      result.data.length,
      result.pagination.limit,
    );
  }
  // If current page equals total pages, data length should be records % limit or limit if zero remainder
  if (result.pagination.current === result.pagination.pages) {
    const remainder = result.pagination.records % result.pagination.limit;
    const expectedLength =
      remainder === 0 ? result.pagination.limit : remainder;
    TestValidator.equals(
      "data length on last page",
      result.data.length,
      expectedLength,
    );
  }
}
