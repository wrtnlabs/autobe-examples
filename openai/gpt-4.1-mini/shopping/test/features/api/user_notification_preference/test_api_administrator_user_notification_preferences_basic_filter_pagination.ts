import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_notification_preferences_basic_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Join and Authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(adminAuthorized);
  // Set authorization header
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Prepare filter parameters for tests
  // We will test filtering by customer_id, and also by channel_name and notification_type
  // Since the exact ids are not known (no creation in scenario), we test with null (disable filter) and random UUIDs
  const filteredCustomerId: string = null as any; // Trying with no filter first
  const filteredChannelName: string | null = null;
  const filteredNotificationType: string | null = null;
  // Testing pagination parameters
  const pageNumber = 1 as number;
  const limitNumber = 10 as number;
  // 2. Fetch all without filter - baseline call to verify pagination and data shape
  const noFilterResponse =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          page: pageNumber,
          limit: limitNumber,
        } satisfies IShoppingMallUserNotificationPreference.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page at least 1",
    noFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    noFilterResponse.pagination.limit >= 1 &&
      noFilterResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    noFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    noFilterResponse.pagination.pages >= 0,
  );
  // Validate data array and each element's structure and that each preference belongs to a customer managed by the admin
  for (const preference of noFilterResponse.data) {
    typia.assert(preference);
    // Only preferences with customer, seller or administrator ownership
    TestValidator.predicate(
      "ownership present",
      preference.customer !== null ||
        preference.seller !== null ||
        preference.administrator !== null,
    );
    // If customer ownership present, admin can manage those customers - assume true because no API to check
  }
  // 3. Fetch filtered by customer_id
  // Since no customer_id available from scenario, we use a random UUID (no matches expected) and expect empty data
  const randomCustomerId = typia.random<string & tags.Format<"uuid">>();
  const filteredByCustomerIdResponse =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          customer_id: randomCustomerId,
          page: pageNumber,
          limit: limitNumber,
        } satisfies IShoppingMallUserNotificationPreference.IRequest,
      },
    );
  typia.assert(filteredByCustomerIdResponse);
  // Expect all returned data (if any) to match the customer_id
  for (const preference of filteredByCustomerIdResponse.data) {
    typia.assert(preference.customer);
    TestValidator.equals(
      "filtered by customer id",
      preference.customer?.id,
      randomCustomerId,
    );
  }
  // 4. Test filtering by channel_name and notification_type combined
  // Use typical example values; since no data creation, data may be empty
  const exampleChannelName = "email";
  const exampleNotificationType = "order_update";
  const filteredByChannelAndTypeResponse =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {
          channel_name: exampleChannelName,
          notification_type: exampleNotificationType,
          page: pageNumber,
          limit: limitNumber,
        } satisfies IShoppingMallUserNotificationPreference.IRequest,
      },
    );
  typia.assert(filteredByChannelAndTypeResponse);
  // Validate channelName and notificationType match the filters if provided
  for (const preference of filteredByChannelAndTypeResponse.data) {
    TestValidator.equals(
      "channel_name filter",
      preference.channelName,
      exampleChannelName,
    );
    TestValidator.equals(
      "notification_type filter",
      preference.notificationType,
      exampleNotificationType,
    );
  }
  // 5. Authorization enforcement: try call without authorization - expect failure
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      unauthorizedConnection,
      {
        body: { page: pageNumber, limit: limitNumber },
      },
    );
  });
}
