import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_customer_ban_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for an admin user and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Create a connection for a customer user and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com",
    ip: "192.168.1.2",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // Validate that customer user cannot ban another customer
  await TestValidator.error(
    "customer should not be able to ban another customer",
    async () => {
      const adminAuthorized =
        await api.functional.shoppingMall.auth.admin.login.signIn(
          adminConnection,
          {
            body: {
              email: adminCredentials.email,
              password: adminCredentials.password,
            } satisfies IShoppingMallAdmin.ILogin,
          },
        );
      typia.assert(adminAuthorized);
      const customerAuthorized =
        await api.functional.shoppingMall.auth.customer.login(
          customerConnection,
          {
            body: {
              email: customerCredentials.email,
              password: customerCredentials.password,
            } satisfies IShoppingMallCustomer.ILogin,
          },
        );
      typia.assert(customerAuthorized);
      // Extract customer id from authorized response
      const customerId = customerAuthorized.customerId;
      // Attempt to ban customer as customer (should fail with 403)
      await api.functional.shoppingMall.admin.customers.ban.erase(
        customerConnection,
        {
          customerId,
        },
      );
    },
  );
}
