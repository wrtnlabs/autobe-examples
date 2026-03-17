import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
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

export async function test_api_customer_password_reset_detail_privileged_audit_review(
  connection: api.IConnection,
): Promise<void> {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinedCustomer);
  const reloginCustomerConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(
    reloginCustomerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: customerHref,
        referrer: customerReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loggedInCustomer);
  TestValidator.equals(
    "customer identity preserved after login",
    loggedInCustomer.id,
    joinedCustomer.id,
  );
  TestValidator.equals(
    "customer email preserved after login",
    loggedInCustomer.email,
    joinedCustomer.email,
  );
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorHref = typia.random<string & tags.Format<"uri">>();
  const administratorReferrer = typia.random<string & tags.Format<"uri">>();
  const administratorConnection: api.IConnection = { host: connection.host };
  const joinedAdministrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: administratorHref,
        referrer: administratorReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(joinedAdministrator);
  const reloginAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const loggedInAdministrator = await authorize_administrator_login(
    reloginAdministratorConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: administratorHref,
        referrer: administratorReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(loggedInAdministrator);
  TestValidator.equals(
    "administrator identity preserved after login",
    loggedInAdministrator.id,
    joinedAdministrator.id,
  );
  TestValidator.equals(
    "administrator email preserved after login",
    loggedInAdministrator.email,
    joinedAdministrator.email,
  );
  await TestValidator.httpError(
    "privileged review of unknown password reset id is rejected as missing resource",
    [404, 403, 401],
    async () => {
      await api.functional.shoppingMall.customer.passwordResets.at(
        reloginAdministratorConnection,
        {
          passwordResetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
