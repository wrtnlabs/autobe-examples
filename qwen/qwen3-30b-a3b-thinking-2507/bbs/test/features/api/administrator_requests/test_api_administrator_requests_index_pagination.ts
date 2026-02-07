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

export async function test_api_administrator_requests_index_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.assert<IEconomyPoliticsBoardAdmin.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    }),
  });
  // 2. Call index endpoint to fetch administrator requests
  const output =
    await api.functional.economyPoliticsBoard.admin.administrator_requests.index(
      adminConnection,
      {
        body: typia.assert<IEconomyPoliticsBoardAdministratorRequest.IRequest>(
          {},
        ),
      },
    );
  // 3. Validate response structure
  typia.assert(output);
  // 4. Verify pagination requirements
  TestValidator.equals("data array size", output.data.length, 5);
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("limit", output.pagination.limit, 5);
  TestValidator.equals("total records count", output.pagination.records, 5);
}
