import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account first
  const adminConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: "test@example.com",
    password: "12345678",
    display_name: "Test Customer",
    phone_number: "010-1234-5678",
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(adminConnection, { body: customerData });
  // Try login with wrong password
  await TestValidator.error("should fail with wrong password", async () => {
    await api.functional.shoppingMall.auth.customer.login(adminConnection, {
      body: {
        email: "test@example.com",
        password: "wrongpassword",
        href: "https://example.com/login",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
