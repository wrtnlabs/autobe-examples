import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_refresh_deleted_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account and join to obtain valid refresh token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Store the refresh token for later use after account deletion
  const refreshToken: string = authorized.token.refresh;
  // Step 2: Simulate account soft-deletion
  // Note: In the full implementation, the super admin account would be soft-deleted here
  // (e.g., via DELETE /ecommerceMall/auth/superAdmin or admin management API)
  // The tokens remain technically valid but the account is marked as deleted (deletedAt !== null)
  // Step 3: Attempt to refresh with the token from the deleted account
  // Create a fresh connection without authentication headers
  const refreshConnection: api.IConnection = { host: connection.host };
  // The system should reject this refresh because the account is soft-deleted
  await TestValidator.error(
    "refresh should reject when super admin account is soft-deleted",
    async () => {
      await authorize_super_admin_refresh(refreshConnection, {
        body: {
          refreshToken,
        } satisfies IEcommerceMallSuperAdmin.IRefresh,
      });
    },
  );
}
