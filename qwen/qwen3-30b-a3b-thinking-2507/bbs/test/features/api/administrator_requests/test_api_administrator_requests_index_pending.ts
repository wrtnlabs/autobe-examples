import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_requests_index_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedConnection = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://localhost",
      referrer: "https://localhost/register",
      ip: "127.0.0.1",
    },
  });
  const adminConnectionWithAuth = {
    ...adminConnection,
    ...authorizedConnection,
  };
  // 2. Verify pending requests endpoint
  const response =
    await api.functional.economyPoliticsBoard.admin.administrator_requests.index(
      adminConnectionWithAuth,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("should have pending requests", response.data.length, 0);
  TestValidator.predicate(
    "should return pending status",
    response.data[0]?.status === "pending",
  );
  TestValidator.equals(
    "should include required fields",
    Object.keys(response.data[0] || {}).length,
    5,
  );
  TestValidator.equals(
    "should have default pagination",
    response.pagination.limit,
    20,
  );
}
