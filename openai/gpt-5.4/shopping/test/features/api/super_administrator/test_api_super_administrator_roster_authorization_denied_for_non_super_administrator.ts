import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_super_administrator_roster_authorization_denied_for_non_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  const request = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    includeDeleted: false,
    deletedOnly: false,
    sort: "-updated_at",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSuperAdministrator.IRequest;
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "anonymous cannot browse super administrator roster",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.superAdministrators.index(
        anonymousConnection,
        {
          body: request,
        },
      );
    },
  );
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  await TestValidator.httpError(
    "customer cannot browse super administrator roster",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.superAdministrators.index(
        customerConnection,
        {
          body: request,
        },
      );
    },
  );
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  await TestValidator.httpError(
    "seller cannot browse super administrator roster",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.superAdministrators.index(
        sellerConnection,
        {
          body: request,
        },
      );
    },
  );
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorJoin = await authorize_administrator_join(
    administratorJoinConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoin);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorLogin = await authorize_administrator_login(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(administratorLogin);
  await TestValidator.httpError(
    "administrator cannot browse super administrator roster",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.superAdministrators.index(
        administratorConnection,
        {
          body: request,
        },
      );
    },
  );
}
