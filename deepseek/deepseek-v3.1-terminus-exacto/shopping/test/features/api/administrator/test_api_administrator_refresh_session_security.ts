import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_session_security(
  connection: api.IConnection,
): Promise<void> {
  // Create initial administrator session with specific security context
  const adminConnection1: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Perform first refresh with same security context (should succeed)
  const refresh1 = await api.functional.ecommerce.auth.administrator.refresh(
    adminConnection1,
    {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IEcommerceAdministrator.IRefresh,
    },
  );
  typia.assert(refresh1);
  TestValidator.equals(
    "same security context refresh succeeds",
    refresh1.id,
    initialAuth.id,
  );
  TestValidator.notEquals(
    "refresh generates new access token",
    refresh1.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh generates new refresh token",
    refresh1.token.refresh,
    initialAuth.token.refresh,
  );
  // Create new connection with DIFFERENT security context (simulating different device/location)
  const adminConnection2: api.IConnection = { host: connection.host };
  adminConnection2.headers = {
    ...adminConnection1.headers,
    "User-Agent": "Different-Browser/1.0",
  };
  // Attempt refresh with DIFFERENT security context using original refresh token (should fail)
  await TestValidator.error(
    "refresh with different security context should fail",
    async () => {
      await api.functional.ecommerce.auth.administrator.refresh(
        adminConnection2,
        {
          body: {
            refresh_token: initialAuth.token.refresh,
          } satisfies IEcommerceAdministrator.IRefresh,
        },
      );
    },
  );
  // Attempt refresh with DIFFERENT security context using new refresh token (should fail)
  await TestValidator.error(
    "refresh with different security context using new token should fail",
    async () => {
      await api.functional.ecommerce.auth.administrator.refresh(
        adminConnection2,
        {
          body: {
            refresh_token: refresh1.token.refresh,
          } satisfies IEcommerceAdministrator.IRefresh,
        },
      );
    },
  );
  // Validate token rotation maintains security by refreshing again with original context
  const adminConnection3: api.IConnection = { host: connection.host };
  adminConnection3.headers = { ...adminConnection1.headers };
  const refresh2 = await api.functional.ecommerce.auth.administrator.refresh(
    adminConnection3,
    {
      body: {
        refresh_token: refresh1.token.refresh,
      } satisfies IEcommerceAdministrator.IRefresh,
    },
  );
  typia.assert(refresh2);
  TestValidator.equals(
    "token rotation maintains user identity",
    refresh2.id,
    initialAuth.id,
  );
  TestValidator.notEquals(
    "second refresh generates new access token",
    refresh2.token.access,
    refresh1.token.access,
  );
  TestValidator.notEquals(
    "second refresh generates new refresh token",
    refresh2.token.refresh,
    refresh1.token.refresh,
  );
  // Validate that old refresh token cannot be reused
  await TestValidator.error("old refresh token reuse should fail", async () => {
    await api.functional.ecommerce.auth.administrator.refresh(
      adminConnection3,
      {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies IEcommerceAdministrator.IRefresh,
      },
    );
  });
  // Validate session integrity by checking consistent administrator identity
  TestValidator.equals(
    "administrator ID consistent across operations",
    initialAuth.id,
    refresh1.id,
  );
  TestValidator.equals(
    "administrator email consistent across operations",
    initialAuth.email,
    refresh1.email,
  );
  TestValidator.equals(
    "administrator ID consistent in final refresh",
    initialAuth.id,
    refresh2.id,
  );
}
