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

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name(1);
  const phone = RandomGenerator.mobile();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Create actor-specific connection (isolation pattern)
  const customerConnection: api.IConnection = { host: connection.host };
  // 3. Use utility function (MANDATORY for POST /shoppingMall/auth/customer/join)
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      nickname,
      phone,
      href,
      referrer,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Full type validation via typia.assert
  typia.assert(authorized);
  // 5. Validate business logic fields
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("nickname matches input", authorized.nickname, nickname);
  TestValidator.equals(
    "isBanned is false for new account",
    authorized.isBanned,
    false,
  );
  TestValidator.equals(
    "deletedAt is null for active account",
    authorized.deletedAt,
    null,
  );
  // 6. Validate nested customer object
  TestValidator.equals(
    "customer.email matches input",
    authorized.customer.email,
    email,
  );
  TestValidator.equals(
    "customer.nickname matches input",
    authorized.customer.nickname,
    nickname,
  );
  TestValidator.equals(
    "customer.isBanned is false",
    authorized.customer.isBanned,
    false,
  );
  TestValidator.equals(
    "customer.deletedAt is null",
    authorized.customer.deletedAt,
    null,
  );
  // 7. Validate token fields are non-empty
  TestValidator.predicate(
    "token.access is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 8. Security check: password must NOT appear in response
  const responseString = JSON.stringify(authorized);
  TestValidator.predicate(
    "password not present in response",
    !responseString.includes(password),
  );
}
