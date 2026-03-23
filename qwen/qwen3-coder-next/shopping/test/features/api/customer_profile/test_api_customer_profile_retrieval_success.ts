import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const customerData = {
    email: (typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1>),
    password: RandomGenerator.alphaNumeric(16),
    name: name,
    phone: phone,
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // Retrieve customer profile
  const profile =
    await api.functional.ecommerceMall.customer.customers.me.at(
      customerConnection,
    );
  typia.assert(profile);
  // Validate response structure
  TestValidator.equals(
    "customer ID matches",
    profile.user_id,
    authorized.customer.id,
  );
  TestValidator.equals(
    "email matches",
    profile.customer.email,
    authorized.customer.email,
  );
  TestValidator.equals(
    "is_suspended is false",
    profile.customer.is_suspended,
    false,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof profile.customer.created_at === "string",
  );
  // Validate profile fields match input
  TestValidator.equals("display name matches", profile.display_name, name);
  TestValidator.equals("phone number matches", profile.phone_number, phone);
}