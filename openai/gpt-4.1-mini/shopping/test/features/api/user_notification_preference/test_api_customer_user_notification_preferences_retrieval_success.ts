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

export async function test_api_customer_user_notification_preferences_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test the retrieval of user notification preferences by an authenticated customer.
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  // Update connection headers with authorization token
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Retrieve user notification preferences without filters to test default pagination
  const defaultRequest: IShoppingMallUserNotificationPreference.IRequest = {};
  const defaultResponse =
    await api.functional.shoppingMall.customer.userNotificationPreferences.index(
      customerConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  // Validate pagination defaults
  TestValidator.predicate(
    "pagination current page defaults to 1",
    defaultResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit defaults to 10",
    defaultResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent with records and limit",
    defaultResponse.pagination.pages ===
      Math.ceil(
        defaultResponse.pagination.records / defaultResponse.pagination.limit,
      ),
  );
  // Validate each notification preference item structure
  for (const pref of defaultResponse.data) {
    typia.assert(pref);
    TestValidator.predicate(
      "channelName is non-empty string",
      typeof pref.channelName === "string" && pref.channelName.length > 0,
    );
    TestValidator.predicate(
      "notificationType is non-empty string",
      typeof pref.notificationType === "string" &&
        pref.notificationType.length > 0,
    );
    TestValidator.predicate(
      "isEnabled is boolean",
      typeof pref.isEnabled === "boolean",
    );
    // Ownership references consist of either customer or seller or administrator reference
    const ownershipRefs = [
      pref.customer,
      pref.seller,
      pref.administrator,
    ].filter((ref) => ref !== null && ref !== undefined);
    TestValidator.predicate(
      "ownership reference count is at most 1",
      ownershipRefs.length <= 1,
    );
    // If customer ref exists, must match authorized customer id
    if (pref.customer !== null && pref.customer !== undefined) {
      TestValidator.equals(
        "ownership customer id matches logged-in customer",
        pref.customer.id,
        authorizedCustomer.id,
      );
    }
    // Seller or Administrator owned preferences should not be returned to a customer
    TestValidator.predicate(
      "seller ownership is null",
      pref.seller === null || pref.seller === undefined,
    );
    TestValidator.predicate(
      "administrator ownership is null",
      pref.administrator === null || pref.administrator === undefined,
    );
  }
  // 3. Attempt to query notification preferences for another customer - should not be allowed
  const fakeCustomerId = typia.random<string & tags.Format<"uuid">>();
  if (fakeCustomerId !== authorizedCustomer.id) {
    const unauthorizedRequest: IShoppingMallUserNotificationPreference.IRequest =
      {
        customer_id: fakeCustomerId,
      };
    const unauthorizedResponse =
      await api.functional.shoppingMall.customer.userNotificationPreferences.index(
        customerConnection,
        { body: unauthorizedRequest },
      );
    typia.assert(unauthorizedResponse);
    // There should be no preferences belonging to the fake customer in this response
    const hasUnauthorizedPref = unauthorizedResponse.data.some(
      (pref) => pref.customer?.id === fakeCustomerId,
    );
    TestValidator.predicate(
      "cannot retrieve other customer's notification preferences",
      !hasUnauthorizedPref,
    );
  }
}
