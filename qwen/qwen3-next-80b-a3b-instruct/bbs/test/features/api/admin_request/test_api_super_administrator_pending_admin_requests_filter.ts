import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_pending_admin_requests_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperAdminPass123!",
      } satisfies IEconomicBoardSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 2. Verify super-administrator access: Filter for pending admin requests
  // Even though scenario requests filtering, IEconomicBoardAdminRequest.IRequest is empty, so we can only send empty object
  const filterBody: IEconomicBoardAdminRequest.IRequest = {};
  const response =
    await api.functional.economicBoard.superAdministrator.admin_requests.index(
      superAdminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(response);
  // 3. Validate response structure: Only validate what exists in schema
  TestValidator.equals("pagination limit is 25", response.pagination.limit, 25);
  // Verify pagination metadata is consistent
  TestValidator.predicate(
    "pagination has positive current page",
    () => response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is correct",
    () =>
      response.pagination.pages === Math.ceil(response.pagination.records / 25),
  );
  // Validate that data array is present and has correct structure
  TestValidator.predicate("data array exists", () =>
    Array.isArray(response.data),
  );
  TestValidator.predicate("data array has correct item structure", () =>
    response.data.every((item) => typeof item === "object" && item !== null),
  );
}
