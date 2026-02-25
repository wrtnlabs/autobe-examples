import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_invalid_phone_format(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2. Test invalid phone number format - too short (less than 10 digits)
  const invalidBodyShort = {
    phone_number: "123" satisfies string & tags.Pattern<"^\\+?[0-9]{10,15}$">,
  } satisfies IShoppingMallCustomer.IUpdate;
  await TestValidator.error("invalid phone number too short", async () => {
    await api.functional.shoppingMall.customer.customers.profile.updateProfile(
      customerConnection,
      { body: invalidBodyShort },
    );
  });
  // 3. Test invalid phone number format - contains letters
  const invalidBodyLetters = {
    phone_number: "123-456-abc" satisfies string &
      tags.Pattern<"^\\+?[0-9]{10,15}$">,
  } satisfies IShoppingMallCustomer.IUpdate;
  await TestValidator.error("invalid phone number with letters", async () => {
    await api.functional.shoppingMall.customer.customers.profile.updateProfile(
      customerConnection,
      { body: invalidBodyLetters },
    );
  });
  // 4. Test valid phone number format to ensure the endpoint works correctly
  const validBody = {
    phone_number: "+12345678901" satisfies string &
      tags.Pattern<"^\\+?[0-9]{10,15}$">,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.customer.customers.profile.updateProfile(
      customerConnection,
      { body: validBody },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    "+12345678901",
  );
}