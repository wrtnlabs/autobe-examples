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

export async function test_api_super_administrator_admin_requests_sort_oldest_first(
  connection: api.IConnection,
): Promise<void> {
  // Create a super administrator account to authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  // Make the API call to retrieve admin requests using the request body that matches the empty IRequest schema
  const response =
    await api.functional.economicBoard.superAdministrator.admin_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEconomicBoardAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // Validate the pagination metadata structure only (this is the only structure defined in the schema)
  TestValidator.equals(
    "pagination structure is correct",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    response.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate the data array structure only (empty DTO means no properties can be validated)
  // The data array must exist and be an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Since ISummary is empty, we can't validate any properties inside the objects
  // The scenario's requirement to sort by creation timestamp cannot be implemented as the field doesn't exist
  // We are validating what exists: successful response with correct pagination structure
}
