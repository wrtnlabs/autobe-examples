import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_user_notification_preferences_index_filter_by_owner_type(
  connection: api.IConnection,
) {
  // Create admin connection and authorize as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare filter variations for customer, seller, administrator
  const ownerFilters = [
    { customer_id: typia.random<string & tags.Format<"uuid">>() },
    { seller_id: typia.random<string & tags.Format<"uuid">>() },
    { administrator_id: typia.random<string & tags.Format<"uuid">>() },
  ];
  // For each owner filter, call the index endpoint and validate response
  for (const filter of ownerFilters) {
    // Default pagination
    const pageSize = 10;
    const body: IShoppingMallUserNotificationPreference.IRequest = {
      ...filter,
      page: 1,
      limit: pageSize,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
        adminConnection,
        {
          body,
        },
      );
    // Assert general response structure and types
    typia.assert(result);
    // Check pagination info correctness
    const { pagination, data } = result;
    TestValidator.predicate(
      "pagination current page >= 1",
      pagination.current >= 1,
    );
    TestValidator.predicate("pagination page size > 0", pagination.limit > 0);
    TestValidator.predicate(
      "pagination total records >= 0",
      pagination.records >= 0,
    );
    TestValidator.predicate("pagination total pages >= 0", pagination.pages >= 0);
  }
  // Additional test: pagination with small page size ensures pagination works
  {
    const filter = {
      customer_id: typia.random<string & tags.Format<"uuid">>(),
    };
    const body: IShoppingMallUserNotificationPreference.IRequest = {
      ...filter,
      page: 1,
      limit: 1,
    };
    const result =
      await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
        adminConnection,
        {
          body,
        },
      );
    typia.assert(result);
    TestValidator.predicate("pagination limit is 1", result.pagination.limit === 1);
  }
}
