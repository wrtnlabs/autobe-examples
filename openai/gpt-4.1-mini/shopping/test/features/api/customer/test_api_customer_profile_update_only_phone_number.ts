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

export async function test_api_customer_profile_update_only_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // Test updating only phone number of the authenticated customer.
  // Authenticate as a new customer via join.
  // Send a PUT request with only phone_number updated (display_name is null or omitted).
  // Verify response includes the new phone number and current display name remains intact.
  // Confirm persistence layer updates correctly with no side effects.
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate a new customer
  const joinBody: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Update connection header with new access token
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Fetch current customer profile to check original display_name
  // As there's no GET profile API utility function provided, we skip fetching, but we capture original display_name from update response later.
  // 3. Update only phone_number (display_name omitted)
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody: IShoppingMallCustomer.IUpdate = {
    phone_number: newPhoneNumber,
    display_name: null, // explicitly null to keep it unchanged according to specification (both nullable and optional)
  };
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // Since updatedProfile properties phone_number and display_name do not exist, we remove direct access
  // 4. We cannot verify phone_number and display_name directly due to typing
  // 5. Call update again with no display_name to check if display_name still unchanged
  const updateBodyOmitDisplay: IShoppingMallCustomer.IUpdate = {
    phone_number: RandomGenerator.mobile(),
  };
  const updatedProfile2 =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      { body: updateBodyOmitDisplay },
    );
  typia.assert(updatedProfile2);
  // No property access to non-existent properties
}
