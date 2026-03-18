import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_pending_access_control(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const pendingPage =
    await api.functional.shoppingMall.administrator.administrator_requests.pending.index(
      superAdministratorConnection,
      {
        body: {
          status: "pending",
          applicantType: null,
          keyword: null,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "pending request status filter should be pending",
    pendingPage.data.every((request) => request.status === "pending"),
  );
  const regularAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const regularAdministrator = await authorize_administrator_join(
    regularAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdministrator);
  await TestValidator.httpError(
    "regular administrator should not access pending administrator request queue",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.administrator_requests.pending.index(
        regularAdministratorConnection,
        {
          body: {
            status: "pending",
            applicantType: null,
            keyword: null,
            page: 1,
            limit: 10,
            sort: "created_at",
            order: "desc",
          } satisfies IShoppingMallAdministratorRequest.IRequest,
        },
      );
    },
  );
}
