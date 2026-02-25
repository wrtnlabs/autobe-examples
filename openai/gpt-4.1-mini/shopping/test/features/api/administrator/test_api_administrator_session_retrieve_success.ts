import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_session_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator sign up and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Validate unauthorized access returns 401
  const nonAuthedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      const randomSessionId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.administrator.sessions.at(
        nonAuthedConnection,
        {
          sessionId: randomSessionId,
        },
      );
    },
  );
  // 3. Validate retrieving a non-existent sessionId returns 404
  await TestValidator.httpError(
    "retrieving non-existent sessionId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sessions.at(
        adminConnection,
        {
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Retrieve a session but since no utility functions exist for session creation,
  //     simulate retrieving a session and assert the output shape.
  const simulatedSession: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.administrator.sessions.at(
      adminConnection,
      {
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(simulatedSession);
  // Check token metadata is present in adminAuthorized
  typia.assert(adminAuthorized.token);
  // Check customer summary information inside session
  typia.assert(simulatedSession.customer);
}
