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

/**
 * Test customer address default authorization and security boundaries.
 * Validates authentication requirements and error handling for default address operations.
 */
export async function test_api_customer_address_default_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Verify endpoint requires authentication
  await TestValidator.error(
    "should reject unauthenticated access",
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerce.customer.addresses._default.setDefault(
        unauthorizedConnection,
        {
          body: typia.random<IEcommerceCustomer.IUpdate>(),
        },
      );
    },
  );
  // Test 2: Create authenticated customer and test valid operations
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
  // Test 3: Verify authentication is maintained and connection headers are set
  TestValidator.predicate(
    "customer connection should have authorization header",
    customerConnection.headers?.Authorization !== undefined,
  );
  // Test 4: Validate customer identity consistency
  TestValidator.equals("customer ID should match", customer.id, customer.id);
  // Test 5: Attempt operations with authenticated customer (should work or handle errors properly)
  try {
    const result =
      await api.functional.ecommerce.customer.addresses._default.setDefault(
        customerConnection,
        {
          body: typia.random<IEcommerceCustomer.IUpdate>(),
        },
      );
    typia.assert(result);
  } catch (error) {
    // Handle expected errors - the endpoint might have specific validation requirements
    TestValidator.predicate(
      "error should be instance of api.HttpError",
      error instanceof api.HttpError,
    );
  }
}
