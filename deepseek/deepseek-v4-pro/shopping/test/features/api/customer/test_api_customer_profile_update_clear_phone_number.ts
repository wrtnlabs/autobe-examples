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
 * Test that customer can clear their phone number by setting it to null.
 *
 * Verifies the nullable clearing behavior of the optional phone_number field in the customer profile update endpoint. After joining as a new customer with a phone number, the customer submits a profile update with a new display_name and phone_number explicitly set to null.
 *
 * The key validation confirms that the response returns phone_number as null, proving the phone number has been successfully removed from the profile, while the display_name is updated and all other account fields remain intact.
 *
 * 1. Customer joins with random credentials including a generated phone number.
 * 2. Customer updates profile with a new display_name and phone_number set to null.
 * 3. Validates that phone_number is null in the response.
 * 4. Validates that display_name reflects the updated value.
 */
export async function test_api_customer_profile_update_clear_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Update profile — explicitly set phone_number to null
  const newDisplayName = RandomGenerator.name();
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        display_name: newDisplayName,
        phone_number: null,
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate phone_number cleared and display_name updated
  TestValidator.equals(
    "phone_number should be null",
    updated.phone_number,
    null,
  );
  TestValidator.equals(
    "display_name should be updated",
    updated.display_name,
    newDisplayName,
  );
}
