import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_listing_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Attempt without any authentication
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // Administrator join to get valid admin credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      },
    },
  );
  typia.assert(authorizedAdmin);
  // Create actor-specific connection with valid admin token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: authorizedAdmin.token.access,
  };
  // Verifying access with valid administrator authorization (should succeed)
  const systemVersionListing =
    await api.functional.shoppingMall.administrator.systemVersions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(systemVersionListing);
  // Attempt with invalid token (simulate non-admin or invalid auth)
  const fakeConnection: api.IConnection = { host: connection.host };
  fakeConnection.headers = {
    Authorization: "Bearer invalidtoken123",
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.systemVersions.index(
        fakeConnection,
        {
          body: {},
        },
      );
    },
  );
}
