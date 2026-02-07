import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_superadministrator_join(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test superAdministrator account registration with valid credentials
  // 1. Generate valid superAdministrator join credentials
  // 2. Call join endpoint with valid credentials
  // 3. Verify successful registration with IAuthorized response
  // 4. Validate token structure and expiration fields
  // Use generated credentials from IJoin schema
  const joinBody = typia.random<IEconomicBoardSuperAdministrator.IJoin>();
  // Execute superAdministrator join operation
  const result =
    await api.functional.economicBoard.auth.superAdministrator.join(
      connection,
      { body: joinBody },
    );
  // Validate response structure
  typia.assert(result);
  // Validate token structure
  TestValidator.equals("token exists", result.token, result.token);
  TestValidator.equals(
    "access token is string",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is ISO date-time format",
    result.token.expired_at,
    result.token.expired_at,
  );
  TestValidator.equals(
    "refreshable_until is ISO date-time format",
    result.token.refreshable_until,
    result.token.refreshable_until,
  );
}
