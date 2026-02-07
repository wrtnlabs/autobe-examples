import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_list_access_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphabets(10),
        } satisfies IEconomicBoardSuperAdministrator.IJoin,
      },
    );
  typia.assert(superAdminJoinResponse);
  // 2. Authenticate as super administrator using the utility function
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminLoginResponse =
    await authorize_super_administrator_login(superAdminLoginConnection, {
      body: {
        email: superAdminJoinResponse.token.access,
        password: RandomGenerator.alphabets(10),
      } satisfies IEconomicBoardSuperAdministrator.ILogin,
    });
  // 3. Access admin request list as super admin — we cannot create requests since no submit endpoint exists
  // The scenario assumes pending admin requests already exist in the system
  // We directly use the provided endpoint
  const adminRequestsConnection: api.IConnection = { host: connection.host };
  adminRequestsConnection.headers = {
    Authorization: `Bearer ${superAdminLoginResponse.token.access}`,
  };
  const adminRequestsList =
    await api.functional.economicBoard.citizen.admin_requests.index(
      adminRequestsConnection,
    );
  typia.assert(adminRequestsList);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination limit is 25",
    adminRequestsList.pagination.limit,
    25,
  );
  TestValidator.equals(
    "current page is 1",
    adminRequestsList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is greater than 0",
    adminRequestsList.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    adminRequestsList.pagination.pages >= 1,
  );
  TestValidator.equals(
    "all items are admin requests",
    adminRequestsList.data.length,
    adminRequestsList.pagination.records,
  );
  TestValidator.predicate(
    "all requests are pending",
    adminRequestsList.data.every((request) => (request as any).status === "pending"),
  );
  TestValidator.predicate(
    "requests are ordered by created_at descending",
    adminRequestsList.data.every(
      (request, index, array) =>
        index === 0 ||
        new Date((request as any).created_at) <= new Date((array[index - 1] as any).created_at),
    ),
  );
}