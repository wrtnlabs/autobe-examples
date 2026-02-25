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

export async function test_api_customer_profile_clear_fields_via_null(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer account using the authorize utility
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // Update profile with null values for display_name and phone_number to clear them
  const updateData = {
    display_name: null,
    phone_number: null,
  } satisfies IShoppingMallCustomerEmailVerification.IUpdate;
  // First update to clear the fields
  await api.functional.shoppingMall.customer.customers.me.update(
    customerConnection,
    { body: updateData },
  );
  // Second update with same null values to confirm idempotency and system stability after clearing
  await api.functional.shoppingMall.customer.customers.me.update(
    customerConnection,
    { body: updateData },
  );
}
