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

export async function test_api_customer_profile_retrieval_after_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with explicit values
  const customerConnection: api.IConnection = { host: connection.host };
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalNickname = RandomGenerator.name(1);
  const originalPhone = RandomGenerator.mobile();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: originalEmail,
      nickname: originalNickname,
      phone: originalPhone,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // customerConnection now has Authorization header set
  // 2. Update the customer's profile with new values
  const updatedNickname = RandomGenerator.name(2);
  const updatedPhone = RandomGenerator.mobile("011");
  const updateBody = {
    nickname: updatedNickname,
    phone: updatedPhone,
  } satisfies IShoppingMallCustomer.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 3. Retrieve the current profile
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 4. Validate business logic
  // Nickname should reflect updated value
  TestValidator.equals("nickname updated", profile.nickname, updatedNickname);
  // Phone should reflect updated value
  TestValidator.equals("phone updated", profile.phone, updatedPhone);
  // Email must remain unchanged (immutable)
  TestValidator.equals("email unchanged", profile.email, originalEmail);
  // isBanned should still be false
  TestValidator.equals("isBanned is false", profile.isBanned, false);
  // deletedAt should still be null
  TestValidator.equals("deletedAt is null", profile.deletedAt, null);
  // updatedAt should be >= createdAt (profile was modified after registration)
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(profile.updatedAt).getTime() >=
      new Date(profile.createdAt).getTime(),
  );
}
