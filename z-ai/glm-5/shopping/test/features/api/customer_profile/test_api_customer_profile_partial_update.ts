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
 * Test partial profile update where an authenticated customer updates only one field
 * while leaving the other unchanged. This validates that fields can be updated
 * independently without affecting other profile data.
 *
 * Test Flow:
 * 1. Create a new customer account with initial profile information
 * 2. Update only the display name while leaving phone number unspecified
 * 3. Verify the display name is updated but phone number remains unchanged
 * 4. Perform a second update changing only the phone number
 * 5. Verify independent field updates work correctly
 */
export async function test_api_customer_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account with initial profile information
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      displayName: initialDisplayName,
      phone: initialPhoneNumber,
    },
  });
  typia.assert(authResult);
  // Verify initial profile data
  TestValidator.equals(
    "initial display name",
    authResult.displayName,
    initialDisplayName,
  );
  TestValidator.equals(
    "initial phone number",
    authResult.phoneNumber,
    initialPhoneNumber,
  );
  // 2. Update only the display name while leaving phone number unspecified
  const newDisplayName = RandomGenerator.name();
  const firstUpdate =
    await api.functional.shoppingMall.customer.customers.me.update(
      customerConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // 3. Verify the display name is updated but phone number remains unchanged
  TestValidator.equals(
    "display name updated",
    firstUpdate.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number unchanged after display name update",
    firstUpdate.phoneNumber,
    initialPhoneNumber,
  );
  // 4. Perform a second update changing only the phone number
  const newPhoneNumber = RandomGenerator.mobile();
  const secondUpdate =
    await api.functional.shoppingMall.customer.customers.me.update(
      customerConnection,
      {
        body: {
          phoneNumber: newPhoneNumber,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 5. Verify independent field updates work correctly
  TestValidator.equals(
    "display name unchanged after phone update",
    secondUpdate.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    secondUpdate.phoneNumber,
    newPhoneNumber,
  );
}
