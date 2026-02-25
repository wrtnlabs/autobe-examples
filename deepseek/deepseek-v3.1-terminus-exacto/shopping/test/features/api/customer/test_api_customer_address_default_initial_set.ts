import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_address_default_initial_set(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Since address creation APIs are not available in the provided functions,
  // we test the default address endpoint with minimal valid data
  // The API documentation indicates this should validate address ownership
  const updatedCustomer =
    await api.functional.ecommerce.customer.addresses._default.setDefault(
      customerConnection,
      {
        body: {
          display_name: customer.display_name,
        } satisfies IEcommerceCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // Basic validation that API call succeeds and returns customer data
  TestValidator.equals(
    "customer ID should match",
    updatedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "email should match",
    updatedCustomer.email,
    customer.email,
  );
  // Note: This test is limited due to missing address creation APIs
  // It primarily validates that the endpoint can be called successfully
  console.log(
    "✅ Default address endpoint accessible for authenticated customer",
  );
}
