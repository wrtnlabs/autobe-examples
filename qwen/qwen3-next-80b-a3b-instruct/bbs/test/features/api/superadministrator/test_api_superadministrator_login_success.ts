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

export async function test_api_superadministrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new superAdministrator account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  // Since IEconomicBoardSuperAdministrator.IJoin is defined as {} (empty object),
  // we must use an empty object body as required by the schema
  const joinResponse =
    await api.functional.economicBoard.auth.superAdministrator.join(
      joinConnection,
      {
        body: {}, // Empty body per schema definition
      },
    );
  typia.assert(joinResponse);
  // Login with empty body per ILogin schema definition
  const loginConnection: api.IConnection = { host: connection.host };
  // Use the provided utility function that expects empty body per ILogin
  const loginResponse = await authorize_super_administrator_login(
    loginConnection,
    {
      body: {}, // Empty body per schema definition
    },
  );
  typia.assert(loginResponse);
  // Validate token structure - access and refresh tokens must be non-empty strings
  TestValidator.equals(
    "token access presence",
    loginResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token refresh presence",
    loginResponse.token.refresh.length > 0,
    true,
  );
  // Validate token expiration timestamps are valid ISO 8601 date-time format strings
  TestValidator.predicate("access token not expired", () => {
    const expiredAt = new Date(loginResponse.token.expired_at);
    return expiredAt > new Date();
  });
  TestValidator.predicate("refresh token still valid", () => {
    const refreshUntil = new Date(loginResponse.token.refreshable_until);
    return refreshUntil > new Date();
  });
}
