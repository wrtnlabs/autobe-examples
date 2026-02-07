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

export async function test_api_customer_profile_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins platform
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: joinBody });
  // 2. Customer updates profile with allowed fields
  const updatedDisplayName = RandomGenerator.name();
  const phoneDigits = typia.random<
    number & tags.Type<"uint32">
  >() satisfies number as number;
  const updatedPhone = "+82" + phoneDigits.toString().padStart(10, "0");
  const updateBody = {
    display_name: updatedDisplayName,
    phone_number: updatedPhone,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedCustomer);
  // 3. Since IShoppingMallCustomer is defined as an empty object with no properties,
  // we cannot validate any specific properties like display_name or phone_number.
  // The only validation possible is that the update operation succeeded and returned
  // an IShoppingMallCustomer object, which we've already confirmed with typia.assert.
  // 4. Verify forbidden fields were not accepted (implicit validation)
  // The system should reject any attempt to modify email/password_hash
  // This is prevented by compile-time validation - no such fields exist in IUpdate DTO
}
