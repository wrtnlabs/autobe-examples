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
 * Test customer profile phone number update functionality.
 *
 * This test validates:
 * 1. Customer registration with initial phone number
 * 2. Profile update with new phone number
 * 3. Response contains updated phone number
 * 4. Phone number actually changed from original
 *
 * Note: Address cascade verification is not included as address-related
 * API endpoints are not available in the provided materials.
 */
export async function test_api_customer_profile_update_phone_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const originalPhone = RandomGenerator.mobile();
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: originalPhone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  TestValidator.equals(
    "initial phone matches",
    authResult.phone_number,
    originalPhone,
  );
  // 2. Update profile with new phone number
  const newPhone = RandomGenerator.mobile();
  const updateResult =
    await api.functional.shoppingMall.customer.customers.profile.update(
      customerConnection,
      {
        body: {
          phoneNumber: newPhone,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 3. Verify profile update response shows new phone number
  TestValidator.equals(
    "updated phone matches",
    updateResult.phone_number,
    newPhone,
  );
  // 4. Validate phone number actually changed
  TestValidator.notEquals("phone number changed", originalPhone, newPhone);
  TestValidator.predicate(
    "phone format valid",
    updateResult.phone_number.length >= 10,
  );
}
