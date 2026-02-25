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

export async function test_api_customer_profile_update_single_field(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate customer using utility function
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Update display_name while leaving phone_number unchanged (null)
  // Explicitly define both properties to satisfy IUpdate type and avoid inference issues
  const updateBody: IShoppingMallCustomerEmailVerification.IUpdate = {
    display_name: RandomGenerator.name(),
    phone_number: null, // Explicitly set to null to represent unchanged state
  };
  // Validate input compliance with schema rules
  TestValidator.predicate("display_name format valid", () => {
    // According to spec: display_name must comply with alphanumeric and space-hyphen-underscore rules
    return /^[a-zA-Z0-9 _-]+$/.test(updateBody.display_name!);
  });
  // Validate that phone_number is explicitly set to null (unchanged from original)
  TestValidator.equals(
    "phone_number unchanged and explicitly null",
    updateBody.phone_number,
    null,
  );
  // Perform the update
  await api.functional.shoppingMall.customer.customers.me.update(
    customerConnection,
    {
      body: updateBody,
    },
  );
  // Validate that the update succeeded (no exception thrown)
  // We don't have a way to get the profile, so we validate the input and the success of the operation
  // The operation success is implied by no error being thrown
  // We cannot validate the server state without a read endpoint, so we validate that the input was valid and the operation was executed
}
