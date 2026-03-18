import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_account_detail_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const administratorViewedCustomerA =
    await api.functional.shoppingMall.administrator.customers.at(
      administratorConnection,
      {
        customerId: customerA.id,
      },
    );
  typia.assert(administratorViewedCustomerA);
  TestValidator.equals(
    "administrator can view customer account",
    administratorViewedCustomerA.id,
    customerA.id,
  );
  const customerAViewedOwnAccount =
    await api.functional.shoppingMall.administrator.customers.at(
      customerAConnection,
      {
        customerId: customerA.id,
      },
    );
  typia.assert(customerAViewedOwnAccount);
  TestValidator.equals(
    "customer can view own account",
    customerAViewedOwnAccount.id,
    customerA.id,
  );
  await TestValidator.httpError(
    "customer cannot view another customer's account",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.customers.at(
        customerAConnection,
        {
          customerId: customerB.id,
        },
      );
    },
  );
}
