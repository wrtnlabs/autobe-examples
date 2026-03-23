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

export async function test_api_customer_profile_update_duplicate_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two separate customer accounts
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Creds = {
    email: (typia.random<string>() satisfies string as string & tags.Format<"email">) satisfies string as string & tags.Format<"email"> & tags.MinLength<1>,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("010"),
  } satisfies IEcommerceMallCustomer.IJoin;
  await authorize_customer_join(customer1Connection, { body: customer1Creds });
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Creds = {
    email: (typia.random<string>() satisfies string as string & tags.Format<"email">) satisfies string as string & tags.Format<"email"> & tags.MinLength<1>,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile("011"),
  } satisfies IEcommerceMallCustomer.IJoin;
  await authorize_customer_join(customer2Connection, { body: customer2Creds });
  // 2. First customer successfully updates phone number
  const newPhoneNumber = RandomGenerator.mobile("010");
  const updatedProfile1 =
    await api.functional.ecommerceMall.customer.profile.update(
      customer1Connection,
      {
        body: {
          display_name: customer1Creds.name!,
          phone_number: newPhoneNumber,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile1);
  TestValidator.equals(
    "first customer phone updated",
    updatedProfile1.phone_number,
    newPhoneNumber,
  );
  // 3. Second customer attempts to use the same phone number (should fail)
  await TestValidator.error("duplicate phone number conflict", async () => {
    await api.functional.ecommerceMall.customer.profile.update(
      customer2Connection,
      {
        body: {
          display_name: customer2Creds.name!,
          phone_number: newPhoneNumber,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  });
  // 4. Verify first customer's phone number remains unchanged
  const finalProfile1 =
    await api.functional.ecommerceMall.customer.profile.update(
      customer1Connection,
      {
        body: {
          display_name: customer1Creds.name!,
          phone_number: customer1Creds.phone!,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(finalProfile1);
  TestValidator.equals(
    "first customer original phone restored",
    finalProfile1.phone_number,
    customer1Creds.phone,
  );
}