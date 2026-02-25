import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_with_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Prepare updated profile data with both fields
  const updatedProfile: IShoppingMallCustomerEmailVerification.IUpdate = {
    display_name: "Jane Doe",
    phone_number: "+1-202-555-0123",
  };
  // 3. Update customer profile
  await api.functional.shoppingMall.customer.customers.me.update(
    customerConnection,
    {
      body: updatedProfile,
    },
  );
  // 4. Re-authenticate using the same credentials to retrieve the updated profile
  // Using the original plaintext password stored in the 'password' variable
  const updatedCustomer = await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(updatedCustomer);
  // 5. Validate the update
  TestValidator.equals(
    "display_name updated correctly",
    updatedCustomer.display_name,
    "Jane Doe",
  );
  TestValidator.equals(
    "phone_number updated correctly",
    updatedCustomer.phone_number,
    "+1-202-555-0123",
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedCustomer.email,
    customer.email,
  );
  TestValidator.predicate(
    "updated_at is set",
    updatedCustomer.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      updatedCustomer.updated_at,
    ),
  );
}
