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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_preferences_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Tests fetching user notification preferences with filters for channel_name and notification_type by an authenticated customer.
  // Validates that results only include preferences matching the filters.
  // Also tests empty result handling and pagination limits.
  // 1. Customer join and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(authorizedCustomer);
  // Update customerConnection with access token (no 'Bearer ' prefix needed)
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Prepare filter criteria
  // Since no creation APIs for notification preferences are given, we test with parameters possibly resulting in empty set
  const filterChannelName = "email";
  const filterNotificationType = "order_update";
  const limit = 5;
  const page = 1;
  // 3. Query filtered notification preferences
  const response =
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      customerConnection,
      {
        body: {
          customer_id: authorizedCustomer.id,
          channel_name: filterChannelName,
          notification_type: filterNotificationType,
          limit,
          page,
        } satisfies IShoppingMallUserNotificationPreference.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response pagination properties
  TestValidator.predicate(
    "page current is correct",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "page limit is correct",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "page records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages is consistent",
    response.pagination.pages >= 0,
  );
  // 5. Validate each preference matches filter criteria
  response.data.forEach((pref) => {
    typia.assert(pref); // Assert structure
    TestValidator.equals(
      "preference channel matches filter",
      pref.channelName,
      filterChannelName,
    );
    TestValidator.equals(
      "preference notification type matches filter",
      pref.notificationType,
      filterNotificationType,
    );
    TestValidator.predicate(
      "preference belongs to customer",
      pref.customer !== null && pref.customer?.id === authorizedCustomer.id,
    );
  });
  // 6. Test edge case: request with no matching filters (e.g., unknown channel and notification type)
  const emptyResponse =
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      customerConnection,
      {
        body: {
          customer_id: authorizedCustomer.id,
          channel_name: "nonexistent_channel_xyz",
          notification_type: "nonexistent_type_xyz",
          limit,
          page,
        } satisfies IShoppingMallUserNotificationPreference.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result data length",
    emptyResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "empty result pagination records zero",
    emptyResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty result pagination pages zero",
    emptyResponse.pagination.pages === 0,
  );
}
