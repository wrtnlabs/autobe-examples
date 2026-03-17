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

export async function test_api_customer_profile_update_nickname_and_phone(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const originalNickname = "OriginalName";
  const originalPhone = "010-1111-2222";
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: registrationEmail,
      nickname: originalNickname,
      phone: originalPhone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  const customerId = authorized.id;
  const registeredEmail = authorized.email;
  // Step 2: Update the customer's profile (nickname and phone)
  const newNickname = "UpdatedName";
  const newPhone = "010-9999-8888";
  const updated = await api.functional.shoppingMall.customer.profile.update(
    customerConnection,
    {
      body: {
        nickname: newNickname,
        phone: newPhone,
      } satisfies IShoppingMallCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // Step 3: Validate updated profile fields
  TestValidator.equals("nickname updated", updated.nickname, newNickname);
  TestValidator.equals("phone updated", updated.phone, newPhone);
  TestValidator.equals("email is immutable", updated.email, registeredEmail);
  TestValidator.equals("isBanned is false", updated.isBanned, false);
  TestValidator.equals("deletedAt is null", updated.deletedAt, null);
  TestValidator.equals("id matches registration", updated.id, customerId);
  TestValidator.predicate(
    "updatedAt >= createdAt",
    new Date(updated.updatedAt) >= new Date(updated.createdAt),
  );
}
