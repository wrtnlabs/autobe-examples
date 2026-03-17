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

export async function test_api_customer_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare test data for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name(1);
  const phone = RandomGenerator.mobile();
  // 2. Create an isolated customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      nickname,
      phone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 3. Retrieve the authenticated customer's profile
  const profile =
    await api.functional.shoppingMall.customer.profile.at(customerConnection);
  typia.assert(profile);
  // 4. Business logic validations
  // Email must match registration input (immutable identifier)
  TestValidator.equals("email matches registration", profile.email, email);
  // Nickname must match registration input
  TestValidator.equals(
    "nickname matches registration",
    profile.nickname,
    nickname,
  );
  // Phone must match registration input
  TestValidator.equals("phone matches registration", profile.phone, phone);
  // A newly registered customer must not be banned
  TestValidator.predicate(
    "isBanned is false for new customer",
    profile.isBanned === false,
  );
  // An active account must have deletedAt as null
  TestValidator.predicate(
    "deletedAt is null for active account",
    profile.deletedAt === null,
  );
}
