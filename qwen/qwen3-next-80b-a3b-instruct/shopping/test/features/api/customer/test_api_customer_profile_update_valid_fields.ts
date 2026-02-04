import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_profile_update_valid_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Use the authenticated connection to update customer profile
  const updatedProfile =
    await api.functional.shoppingMall.customer.customers.me.update(
      customerConnection,
      {
        body: {
          displayName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Validate update was successful
  TestValidator.equals(
    "displayName updated correctly",
    updatedProfile.displayName,
    authResult.displayName,
  );
  TestValidator.equals(
    "phoneNumber updated correctly",
    updatedProfile.phoneNumber,
    authResult.phoneNumber,
  );
  TestValidator.equals(
    "customerId unchanged",
    updatedProfile.customerId,
    authResult.customerId,
  );
}
