import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_superadministrator_banned_users_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator account
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
  typia.assert(superAdmin);
  // Update connection with new token
  superAdminConnection.headers = {
    Authorization: `${superAdmin.token.access}`,
  };
  // 2. Call the endpoint to retrieve banned users
  const result =
    await api.functional.economicBoard.superAdministrator.banned_users.index(
      superAdminConnection,
    );
  typia.assert(result);
  // 3. Validate response structure: validate the entire contract
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10 by default",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // 5. For each user in data array (if any), validate the ISummary contract
  for (const user of result.data) {
    TestValidator.notEquals("user id is not empty", user.id, "");
    TestValidator.notEquals("user email is not empty", user.email, "");
    TestValidator.predicate(
      "ban_reason is null or string",
      user.ban_reason === null || typeof user.ban_reason === "string",
    );
    TestValidator.notEquals("created_at is not empty", user.created_at, "");
  }
  // 6. Validate that pagination refection: pages = ceil(records / limit)
  const expectedPages =
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    result.pagination.pages,
    expectedPages,
  );
}
