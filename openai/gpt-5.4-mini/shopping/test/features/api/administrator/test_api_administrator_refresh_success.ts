import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(12)}@test.com`;
  const password = `P@ssw0rd_${RandomGenerator.alphabets(8)}`;
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const originalRefresh = joined.token.refresh;
  const originalAccess = joined.token.access;
  const refreshed = await authorize_administrator_refresh(adminConnection, {
    body: {
      refreshToken: originalRefresh,
    } satisfies IMallPlatformAdministrator.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "administrator id should remain the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should remain the same",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade should remain the same",
    refreshed.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should remain the same",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "administrator createdAt should remain the same",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "administrator deletedAt should remain the same",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.notEquals(
    "refresh should issue a new access token",
    refreshed.token.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh should issue a new refresh token",
    refreshed.token.refresh,
    originalRefresh,
  );
  const refreshedAgain = await authorize_administrator_refresh(
    adminConnection,
    {
      body: {
        refreshToken: refreshed.token.refresh,
      } satisfies IMallPlatformAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAgain);
  TestValidator.equals(
    "administrator id should still remain the same after second refresh",
    refreshedAgain.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email should still remain the same after second refresh",
    refreshedAgain.email,
    joined.email,
  );
  TestValidator.equals(
    "administrator grade should still remain the same after second refresh",
    refreshedAgain.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator status should still remain the same after second refresh",
    refreshedAgain.status,
    joined.status,
  );
  TestValidator.equals(
    "administrator createdAt should still remain the same after second refresh",
    refreshedAgain.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "administrator deletedAt should still remain the same after second refresh",
    refreshedAgain.deletedAt,
    joined.deletedAt,
  );
}
