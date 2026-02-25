import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_token_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and register a new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    // Use random join data
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(administrator);
  // Use the first valid refresh token from the administrator
  const validRefreshToken = administrator.token.refresh;
  // 1. Test successful refresh with valid refresh token
  const refreshed = await authorize_administrator_refresh(adminConnection, {
    body: { refreshToken: validRefreshToken },
  });
  typia.assert(refreshed);
  // Validate the administrator details
  TestValidator.predicate(
    "access token should be non-empty",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  // Validate timestamps are valid ISO strings and updated
  TestValidator.predicate(
    "access token expired_at should be ISO date-time",
    Boolean(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until should be ISO date-time",
    Boolean(Date.parse(refreshed.token.refreshable_until)),
  );
  // Ensure tokens have changed (new tokens different from old ones)
  TestValidator.notEquals(
    "access token changed",
    refreshed.token.access,
    administrator.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshed.token.refresh,
    administrator.token.refresh,
  );
  // Validate administrator info fields
  TestValidator.equals(
    "administrator id unchanged",
    refreshed.id,
    administrator.id,
  );
  TestValidator.equals(
    "administrator email unchanged",
    refreshed.email,
    administrator.email,
  );
  TestValidator.equals(
    "administrator name unchanged",
    refreshed.name,
    administrator.name,
  );
  TestValidator.equals(
    "administrator isSuperAdmin unchanged",
    refreshed.isSuperAdmin,
    administrator.isSuperAdmin,
  );
  TestValidator.equals(
    "administrator deletedAt unchanged",
    refreshed.deletedAt,
    administrator.deletedAt,
  );
  // Administrator grade summary
  TestValidator.equals(
    "administrator grade id unchanged",
    refreshed.administratorGrade.id,
    administrator.administratorGrade.id,
  );
  TestValidator.equals(
    "administrator grade name unchanged",
    refreshed.administratorGrade.name,
    administrator.administratorGrade.name,
  );
  TestValidator.equals(
    "administrator grade superAdministrator unchanged",
    refreshed.administratorGrade.superAdministrator,
    administrator.administratorGrade.superAdministrator,
  );
  // 2. Test failure on expired or invalid refresh tokens
  // Attempt with an obviously invalid token
  await TestValidator.httpError("refresh with invalid token", 401, async () => {
    await authorize_administrator_refresh(adminConnection, {
      body: { refreshToken: "invalid.token.value" },
    });
  });
  // To test expired token, we would need a token that is expired,
  // but since we cannot manipulate expiration for testing, we rely on invalid tokens
  // 3. Test failure when no token provided
  await TestValidator.httpError("refresh with empty token", 401, async () => {
    await authorize_administrator_refresh(adminConnection, {
      body: { refreshToken: "" },
    });
  });
}
