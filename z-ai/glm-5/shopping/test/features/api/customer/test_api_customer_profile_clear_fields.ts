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

/**
 * Test customer profile field clearing functionality.
 *
 * This test validates that an authenticated customer can explicitly set
 * profile fields (displayName and phoneNumber) to null to remove
 * previously stored information.
 *
 * Flow:
 * 1. Create a customer account with initial display name and phone number
 * 2. Verify the initial profile data is stored correctly
 * 3. Update the profile by setting both displayName and phoneNumber to null
 * 4. Verify the response shows null values for both cleared fields
 */
export async function test_api_customer_profile_clear_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register with profile data
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      displayName: initialDisplayName,
      phone: initialPhoneNumber,
    },
  });
  typia.assert(authorized);
  // 2. Verify initial profile data is stored
  TestValidator.equals(
    "initial displayName stored",
    authorized.displayName,
    initialDisplayName,
  );
  TestValidator.equals(
    "initial phoneNumber stored",
    authorized.phoneNumber,
    initialPhoneNumber,
  );
  // 3. Clear both profile fields by setting them to null
  const updatedCustomer =
    await api.functional.shoppingMall.customer.customers.me.update(
      customerConnection,
      {
        body: {
          displayName: null,
          phoneNumber: null,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 4. Verify both fields are now null
  TestValidator.equals(
    "displayName cleared to null",
    updatedCustomer.displayName,
    null,
  );
  TestValidator.equals(
    "phoneNumber cleared to null",
    updatedCustomer.phoneNumber,
    null,
  );
}
