import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_list_default(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Call banned users endpoint with default parameters
  const result =
    await api.functional.economicBoard.administrator.banned_users.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 25);
  // Validate records and pages >= 0 using predicate (awaited)
  await TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // Validate each user in data array is of type IEconomicBoardCitizen.IS
  for (const user of result.data) {
    typia.assert<IEconomicBoardCitizen.IS>(user);
    // Validate the required fields per DTO definition
    TestValidator.equals(
      "user id is string and uuid",
      typeof user.id,
      "string",
    );
    // Validate email format using predicate with direct boolean result
    await TestValidator.predicate(
      "user email is valid",
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(user.email),
    );
    TestValidator.equals(
      "user display_name type",
      typeof user.display_name,
      "string",
    );
    TestValidator.equals(
      "user ban_reason type",
      typeof user.ban_reason,
      "string",
    );
    TestValidator.equals(
      "user banned_at type",
      typeof user.banned_at,
      "string",
    );
    // Validate format of banned_at (ISO date-time format from DTO)
    await TestValidator.predicate(
      "banned_at is ISO date time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.banned_at),
    );
  }
}
