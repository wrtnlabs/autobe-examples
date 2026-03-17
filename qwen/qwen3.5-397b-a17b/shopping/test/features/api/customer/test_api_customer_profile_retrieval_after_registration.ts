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
 * Test customer profile retrieval after registration.
 *
 * This test validates that a newly registered customer can immediately
 * access their profile information. The test performs the following steps:
 * 1. Register a new customer account with email, password, nickname, and phone_number
 * 2. Retrieve the customer's profile using GET /shoppingMall/customer/profile
 * 3. Validate that the profile contains the correct nickname and phone_number
 *
 * This ensures the auto-created profile is immediately accessible after registration
 * and contains all required fields from the registration data.
 */
export async function test_api_customer_profile_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve customer profile using the authenticated connection
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 3. Validate profile data matches registration data
  TestValidator.equals(
    "nickname matches registration",
    profile.nickname,
    authorized.nickname,
  );
  TestValidator.equals(
    "phone_number matches registration",
    profile.phone_number,
    authorized.phone_number,
  );
}
