import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_analytics_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin user
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // First request: Get first page of inventory analytics
  const firstPageResponse =
    await api.functional.shoppingMall.admin.admin.analytics.inventory.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Extract pagination info from first page
  const { pagination: firstPagination } = firstPageResponse;
  // Validate first page response
  TestValidator.predicate(
    "first page has records",
    firstPagination.records > 0,
  );
  TestValidator.equals("first page current", firstPagination.current, 1);
  TestValidator.predicate(
    "first page has at least one result",
    firstPageResponse.data.length > 0,
  );
  // Second request: Get second page using limit and current
  // Note: The schema doesn't support after_key, so use pagination parameters as defined
  const secondPageResponse =
    await api.functional.shoppingMall.admin.admin.analytics.inventory.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: firstPagination.limit,
        } satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Extract pagination info from second page
  const { pagination: secondPagination } = secondPageResponse;
  // Validate second page response
  TestValidator.equals(
    "second page pagination records matches first page",
    secondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals("second page current is 2", secondPagination.current, 2);
  // Verify that second page has different data from first page
  // Since the DTO is empty, we can only compare the array references
  TestValidator.notEquals(
    "second page data differs from first page",
    firstPageResponse.data,
    secondPageResponse.data,
  );
  // Verify total records count remains consistent
  TestValidator.equals(
    "total records consistent across pages",
    secondPagination.records,
    firstPagination.records,
  );
}
