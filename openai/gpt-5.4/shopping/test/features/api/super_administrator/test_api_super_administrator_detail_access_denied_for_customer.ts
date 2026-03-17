import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_detail_access_denied_for_customer(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorJoin = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: superAdministratorJoinBody,
    },
  );
  typia.assert(superAdministratorJoin);
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customerJoin);
  await TestValidator.httpError(
    "customer cannot read super administrator detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.superAdministrators.at(
        customerConnection,
        {
          superAdministratorId: superAdministratorJoin.id,
        },
      );
    },
  );
  const verifierConnection: api.IConnection = {
    host: connection.host,
  };
  const verifierLoginBody = {
    email: superAdministratorJoinBody.email,
    password: superAdministratorJoinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  const verifierLogin = await authorize_super_administrator_login(
    verifierConnection,
    {
      body: verifierLoginBody,
    },
  );
  typia.assert(verifierLogin);
  const persisted = await api.functional.shoppingMall.superAdministrators.at(
    verifierConnection,
    {
      superAdministratorId: superAdministratorJoin.id,
    },
  );
  typia.assert(persisted);
  TestValidator.equals(
    "super administrator id is stable",
    persisted.id,
    superAdministratorJoin.id,
  );
  TestValidator.equals(
    "super administrator email is stable",
    persisted.email,
    superAdministratorJoin.email,
  );
  TestValidator.equals(
    "super administrator active is stable",
    persisted.active,
    superAdministratorJoin.active,
  );
  TestValidator.equals(
    "super administrator created_at is stable",
    persisted.created_at,
    superAdministratorJoin.created_at,
  );
  TestValidator.equals(
    "super administrator updated_at is stable",
    persisted.updated_at,
    superAdministratorJoin.updated_at,
  );
  TestValidator.equals(
    "super administrator deleted_at is stable",
    persisted.deleted_at,
    superAdministratorJoin.deleted_at,
  );
}
