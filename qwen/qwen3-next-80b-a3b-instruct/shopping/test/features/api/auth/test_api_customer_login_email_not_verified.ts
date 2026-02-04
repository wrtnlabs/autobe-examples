import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_login_email_not_verified(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account without completing email verification
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Use the customer's email and password to attempt login (email not verified)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail with 403 when email is not verified",
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {},
      } satisfies IShoppingMallCustomer.ILogin);
    },
  );
}
