import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
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

export async function test_api_administrator_request_detail_not_found_for_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorEmail = typia.random<string & tags.Format<"email">>();
  const superAdministratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const superAdministratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorJoined = await authorize_super_administrator_join(
    superAdministratorJoinConnection,
    {
      body: {
        email: superAdministratorEmail,
        password: superAdministratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministratorJoined);
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorAuthorized =
    await authorize_super_administrator_login(superAdministratorConnection, {
      body: {
        email: superAdministratorEmail,
        password: superAdministratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.ILogin,
    });
  typia.assert(superAdministratorAuthorized);
  const nonExistentAdministratorRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "super administrator cannot retrieve a non-existent administrator request",
    404,
    async () => {
      await api.functional.shoppingMall.customer.administrator_requests.at(
        superAdministratorConnection,
        {
          administratorRequestId: nonExistentAdministratorRequestId,
        },
      );
    },
  );
}
