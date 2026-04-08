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

export async function test_api_super_admin_soft_deleted_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator using utility function
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(connection, {});
  // 2. Create a new connection with the super admin token for authenticated requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Generate a random UUID that represents a soft-deleted (non-existent) super admin
  const softDeletedSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the soft-deleted super admin account
  // This should return HTTP 404 Not Found since the account is soft-deleted or does not exist
  await TestValidator.httpError(
    "soft-deleted super admin account not found",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admins.at(
        superAdminConnection,
        { superAdminId: softDeletedSuperAdminId },
      ),
  );
}
