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

export async function test_api_administrator_user_notification_preferences_owner_and_channel_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test retrieving user notification preferences with filters for seller_id and administrator_id, combined with filtering by notification channel and type.
  // Verify that the results correctly respect the polymorphic ownership and filter criteria,
  // and that pagination works with different page and limit values.
  // Confirm administrator authorization and that unauthorized access is prevented.
  // 1. Administrator join and authorization setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "password123",
    },
  });
  typia.assert(adminJoinOutput);
  adminConnection.headers = {
    Authorization: adminJoinOutput.token.access,
  };
  // 2. No filter - retrieve at least one page with default settings
  let response =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "default page pagination is at least page 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is 10 or default specified",
    response.pagination.limit === 10,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 3. Test filters combined: seller_id and administrator_id filters with channel_name and notification_type
  // Extract distinct seller IDs and administrator IDs from existing data if any (else simulated UUIDs)
  // Query a set of data to use existing seller and administrator IDs for filtering
  // If no data, this test will ensure the code path runs, but no strict validation on data count
  // Try retrieve unfiltered data to find some seller_id and administrator_id
  const unfiltered =
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(unfiltered);
  // Extract sample seller_id and administrator_id from the first few entries
  const sellerIdSet = new Set<string>();
  const administratorIdSet = new Set<string>();
  for (const pref of unfiltered.data) {
    if (pref.seller?.id) sellerIdSet.add(pref.seller.id);
    if (pref.administrator?.id) administratorIdSet.add(pref.administrator.id);
    if (sellerIdSet.size >= 1 && administratorIdSet.size >= 1) break;
  }
  // If no users available, generate random UUIDs to test filter (results likely empty)
  const sampleSellerId =
    [...sellerIdSet][0] ?? typia.random<string & tags.Format<"uuid">>();
  const sampleAdministratorId =
    [...administratorIdSet][0] ?? adminJoinOutput.id;
  // Use common channel names and notification types for filtering
  const channelNames = ["email", "sms", "push"];
  const notificationTypes = ["order_update", "promotion", "system_alert"];
  for (const channelName of channelNames) {
    for (const notificationType of notificationTypes) {
      const filteredResponse =
        await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
          adminConnection,
          {
            body: {
              seller_id: sampleSellerId,
              administrator_id: sampleAdministratorId,
              channel_name: channelName,
              notification_type: notificationType,
              page: 1,
              limit: 20,
            },
          },
        );
      typia.assert(filteredResponse);
      // Validate all returned data matches filter conditions
      filteredResponse.data.forEach((pref) => {
        if (pref.seller)
          TestValidator.equals("seller filter", pref.seller.id, sampleSellerId);
        if (pref.administrator)
          TestValidator.equals(
            "administrator filter",
            pref.administrator.id,
            sampleAdministratorId,
          );
        TestValidator.equals(
          "channel name filter",
          pref.channelName,
          channelName,
        );
        TestValidator.equals(
          "notification type filter",
          pref.notificationType,
          notificationType,
        );
      });
      // Validate pagination boundaries
      TestValidator.predicate(
        "pagination current page valid",
        filteredResponse.pagination.current >= 1,
      );
      TestValidator.predicate(
        "pagination limit valid",
        filteredResponse.pagination.limit >= 1 &&
          filteredResponse.pagination.limit <= 100,
      );
    }
  }
  // 4. Test pagination with various page and limit values
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 3, limit: 15 },
  ];
  for (const { page, limit } of paginationTests) {
    const pagedResponse =
      await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
        adminConnection,
        {
          body: {
            page,
            limit,
          },
        },
      );
    typia.assert(pagedResponse);
    TestValidator.equals(
      "pagination page",
      pagedResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit",
      pagedResponse.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "paged data array exists",
      Array.isArray(pagedResponse.data) && pagedResponse.data.length <= limit,
    );
  }
  // 5. Test unauthorized access rejected (simulate invalid token)
  const invalidAdminConnection: api.IConnection = { host: connection.host };
  invalidAdminConnection.headers = {
    Authorization: "Bearer invalid.token.here",
  };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.shoppingMall.administrator.userNotificationPreferences.index(
      invalidAdminConnection,
      { body: {} },
    );
  });
}
