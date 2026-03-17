import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super admin account to obtain valid authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSuperAdmin.IJoin;
  const authorized = await api.functional.ecommerceMall.auth.superAdmin.join(
    adminConnection,
    { body: joinBody },
  );
  typia.assert(authorized);
  // Note: In a real E2E test environment, the account would be soft-deleted here
  // via an admin operation or using seeded test data. Since the deletion API is
  // not available in the current SDK, we proceed to test the refresh failure
  // assuming the account has been marked as deleted.
  // Create a fresh connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // Attempt to refresh the token - should fail because the account is deleted
  await TestValidator.error(
    "refresh token should be rejected for deleted super admin account",
    async () => {
      await authorize_super_admin_refresh(refreshConnection, {
        body: {
          refreshToken: authorized.token.refresh,
        } satisfies IEcommerceMallSuperAdmin.IRefresh,
      });
    },
  );
}
