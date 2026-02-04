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
export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate customer using utility function
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // Step 3: Retrieve customer profile using the authenticated connection
  const profile: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.me.at(
      customerConnection,
    );
  typia.assert(profile);
  // Step 4: Validate profile contains expected fields and excludes sensitive data
  TestValidator.equals(
    "profile has customerId",
    profile.customerId,
    authResult.customerId,
  );
  TestValidator.equals(
    "profile has displayName",
    profile.displayName,
    authResult.displayName,
  );
  TestValidator.equals(
    "profile has phoneNumber",
    profile.phoneNumber,
    authResult.phoneNumber,
  );
}
