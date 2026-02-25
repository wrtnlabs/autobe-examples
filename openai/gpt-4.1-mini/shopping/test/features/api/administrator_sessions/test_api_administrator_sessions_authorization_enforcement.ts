import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sessions_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt to list administrator sessions without any authentication
  await TestValidator.httpError(
    "list administrator sessions without auth returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sessions.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // 2. Attempt to list administrator sessions with an invalid auth token
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.here" },
  };
  await TestValidator.httpError(
    "list administrator sessions with invalid token returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sessions.index(
        invalidTokenConnection,
        {
          body: {},
        },
      );
    },
  );
}
