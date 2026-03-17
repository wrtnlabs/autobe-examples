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

export async function test_api_customer_profile_update_phone_cleared_to_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with a non-null phone number
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const initialPhone = RandomGenerator.mobile();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone: initialPhone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Update profile: set nickname to 'NullPhoneCustomer' and phone to null
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        nickname: "NullPhoneCustomer",
        phone: null,
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validations
  TestValidator.equals(
    "nickname updated",
    updated.nickname,
    "NullPhoneCustomer",
  );
  TestValidator.equals("phone cleared to null", updated.phone, null);
  TestValidator.equals("email unchanged", updated.email, email);
  TestValidator.equals("isBanned is false", updated.isBanned, false);
  TestValidator.equals("deletedAt is null", updated.deletedAt, null);
}
