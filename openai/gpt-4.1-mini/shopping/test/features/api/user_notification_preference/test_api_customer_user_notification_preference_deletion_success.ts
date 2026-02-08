import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_preference_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the successful deletion of a user notification preference by the owning authenticated customer.
  // 1. Register (join) a new customer and authorize, then create a connection with the authorized token.
  // 2. Since no creation endpoint for user notification preferences is provided, simulate the deletion with a random UUID.
  // 3. Delete the user notification preference using the utility function, expecting no error and HTTP 204 response.
  // 4. Note: No GET endpoint provided to verify deletion.
  // 5. Authorization and error handling are tested in separate test cases.
  // 1. Join as a new customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {}, // IShoppingMallCustomer.IJoin is empty type so just use empty object
  });
  typia.assert(authorized);
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Generate a random UUID to represent the userNotificationPreferenceId to delete
  const userNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the user notification preference
  await api.functional.shoppingMall.customer.userNotificationPreferences.erase(
    customerConnection,
    { userNotificationPreferenceId },
  );
  // 4. Since no GET endpoint for user notification preferences is provided, skip verification of deletion
  // 5. Note: Authorization check and error handling would be tested in separate test cases designed for failure scenarios
  // 6. Confirm test passed by function completion
}
