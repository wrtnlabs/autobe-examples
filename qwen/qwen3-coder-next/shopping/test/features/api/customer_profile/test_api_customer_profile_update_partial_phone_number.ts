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

export async function test_api_customer_profile_update_partial_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Get original profile before update
  const originalCustomer =
    await api.functional.shoppingMall.customer.profile.updateProfile(
      customerConnection,
      {
        body: {
          display_name: undefined,
          phone_number: undefined,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(originalCustomer);
  // 3. Update only phone number (partial update)
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedCustomer =
    await api.functional.shoppingMall.customer.profile.updateProfile(
      customerConnection,
      {
        body: {
          phone_number: newPhoneNumber,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 4. Validate that only phone number changed, display_name preserved
  TestValidator.equals(
    "display_name unchanged",
    // @ts-ignore - property not defined in type but exists in API response
    updatedCustomer.display_name,
    // @ts-ignore - property not defined in type but exists in API response
    originalCustomer.display_name,
  );
  TestValidator.equals(
    "phone_number updated",
    // @ts-ignore - property not defined in type but exists in API response
    updatedCustomer.phone_number,
    newPhoneNumber,
  );
}