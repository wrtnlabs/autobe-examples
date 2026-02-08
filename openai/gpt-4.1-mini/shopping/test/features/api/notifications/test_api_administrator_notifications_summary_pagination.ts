import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_notifications_summary_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination robustness by requesting notification summaries
  // for administrator with large volume scenario.
  // Step 1: Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Step 2: Fetch first page to get pagination metadata
  const firstPage =
    await api.functional.shoppingMall.administrator.notifications.summary.index(
      adminConnection,
    );
  typia.assert(firstPage);
  const totalPages = firstPage.pagination.pages;
  const totalRecords = firstPage.pagination.records;
  // Basic assertions on pagination metadata
  TestValidator.predicate("pagination pages non-negative", totalPages >= 0);
  TestValidator.predicate("pagination records non-negative", totalRecords >= 0);
  TestValidator.equals(
    "pagination current page on first fetch",
    firstPage.pagination.current,
    1,
  );
  if (totalPages > 0) {
    const MAX_LIMIT = 10;
    // Step 3: Iterate all pages verifying pagination and data
    for (let page = 1; page <= totalPages; page++) {
      // We simulate page and limit query parameters via direct fetch because SDK does not have parameters
      const url = new URL(
        adminConnection.host +
          "/shoppingMall/administrator/notifications/summary",
      );
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", MAX_LIMIT.toString());
      const response = await (async () => {
        // Removed simulate usage because it does not exist and causes compilation failure.
        const fetched = await fetch(url.toString(), {
          method: "GET",
          headers: {
            ...adminConnection.headers,
            "Content-Type": "application/json",
          },
        });
        if (!fetched.ok) throw new Error(`Failed fetching page ${page}`);
        return await fetched.json();
      })();
      typia.assert(response);
      // Validate pagination metadata consistency
      TestValidator.equals(
        `pagination current at page ${page}`,
        response.pagination.current,
        page,
      );
      TestValidator.predicate(
        `pagination limit positive at page ${page}`,
        response.pagination.limit > 0,
      );
      TestValidator.predicate(
        `pagination pages non-negative at page ${page}`,
        response.pagination.pages >= 0,
      );
      TestValidator.equals(
        `pagination records match total at page ${page}`,
        response.pagination.records,
        totalRecords,
      );
      // Validate data length within limit
      TestValidator.predicate(
        `data length within limit at page ${page}`,
        response.data.length <= response.pagination.limit,
      );
      // Data items are empty objects due to DTO definition, validate existence
      for (const notification of response.data) {
        TestValidator.predicate(
          `notification data existence at page ${page}`,
          notification !== undefined && notification !== null,
        );
      }
    }
  }
}
