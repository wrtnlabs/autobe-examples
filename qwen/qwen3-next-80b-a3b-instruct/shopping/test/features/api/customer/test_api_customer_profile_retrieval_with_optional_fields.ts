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

export async function test_api_customer_profile_retrieval_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Use the authenticated connection to fetch profile
  const profileRaw =
    await api.functional.shoppingMall.customer.customers.me.at(
      customerConnection,
    );
  const profile =
    typia.assert<IShoppingMallCustomerEmailVerification>(profileRaw);
  // 3. Validate response structure
  TestValidator.equals("customer id matches", profile.id, registered.id);
  TestValidator.equals(
    "email is exposed but protected",
    profile.email,
    registered.email,
  );
  TestValidator.equals(
    "display_name is optional and null",
    profile.display_name,
    null,
  );
  TestValidator.equals(
    "phone_number is optional and null",
    profile.phone_number,
    null,
  );
  // Validate token structure (from IAuthorized) - ensure it's not included in response
  // Note: The IShoppingMallCustomerEmailVerification does NOT include token - only IAuthorized does
  // This confirms sensitive data is properly excluded from the response
  const tokenProps = [
    "access",
    "refresh",
    "expired_at",
    "refreshable_until",
  ] as const;
  tokenProps.forEach((prop) => {
    TestValidator.predicate(
      prop + " not present in profile",
      !Object.prototype.hasOwnProperty.call(profile, prop),
    );
  });
}
