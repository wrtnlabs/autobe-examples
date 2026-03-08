import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_profile_update_with_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Store initial profile values
  const initialDisplayName = joinResult.display_name;
  const initialPhoneNumber = joinResult.phone_number;
  const customerId = joinResult.id;
  // 2. Update profile with both display_name and phone_number
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedCustomer =
    await api.functional.ecommerceMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 3. Verify updated customer has new values
  TestValidator.equals(
    "display name updated",
    updatedCustomer.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedCustomer.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals("customer ID preserved", updatedCustomer.id, customerId);
  TestValidator.notEquals(
    "display name changed",
    updatedCustomer.display_name,
    initialDisplayName,
  );
  TestValidator.notEquals(
    "phone number changed",
    updatedCustomer.phone_number,
    initialPhoneNumber,
  );
}
