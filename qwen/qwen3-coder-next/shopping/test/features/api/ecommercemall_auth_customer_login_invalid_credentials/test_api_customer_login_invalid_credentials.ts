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

export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1>>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Test login with non-existent email
  await TestValidator.error("non-existent email should fail", async () => {
    await api.functional.ecommerceMall.auth.customer.login(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "somepassword",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  });
  // 3. Test login with wrong password (registered email but incorrect password)
  const registeredEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1>>(registeredEmail),
      password: "correctpassword123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await TestValidator.error("wrong password should fail", async () => {
    await api.functional.ecommerceMall.auth.customer.login(customerConnection, {
      body: {
        email: registeredEmail,
        password: "wrongpassword",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  });
}