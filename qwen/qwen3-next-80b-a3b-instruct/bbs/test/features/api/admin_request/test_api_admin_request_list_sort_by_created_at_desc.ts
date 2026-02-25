import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_list_sort_by_created_at_desc(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicBoardSuperAdministrator.IJoin,
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Retrieve admin requests with default pagination to get first page
  const response =
    await api.functional.economicBoard.superAdministrator.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending", // Filter to get a consistent set of results
          limit: 10,
          page: 1,
        } satisfies IEconomicBoardAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate that created_at values are sorted in descending order (newest first)
  const createdAges = response.data.map((item) =>
    new Date(item.created_at).getTime(),
  );
  for (let i = 0; i < createdAges.length - 1; i++) {
    TestValidator.predicate(
      "created_at descending order",
      createdAges[i] >= createdAges[i + 1],
    );
  }
  // Validate pagination metadata matches first page expectations
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
}
