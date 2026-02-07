import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_version_update_invalid_format(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Register super admin account
  const admin = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(admin);
  // Create new connection with the authorization token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: admin.token.access,
    },
  };
  // Test 1: Invalid version format - missing patch version
  await TestValidator.error(
    "invalid version format: missing patch",
    async () => {
      await api.functional.shoppingMall.superAdmin.versions.putByVersionid(
        authorizedConnection,
        {
          versionId: "123e4567-e89b-12d3-a456-426614174000",
          body: {
            version_number: "1.0",
            migration_timestamp: new Date().toISOString(),
            description: "Test migration",
            is_active: true,
          } satisfies IShoppingMallSystematicVersion.IUpdate,
        },
      );
    },
  );
  // Test 2: Invalid version format - prefixed with 'v'
  await TestValidator.error(
    "invalid version format: prefixed with v",
    async () => {
      await api.functional.shoppingMall.superAdmin.versions.putByVersionid(
        authorizedConnection,
        {
          versionId: "123e4567-e89b-12d3-a456-426614174001",
          body: {
            version_number: "v1.0.0",
            migration_timestamp: new Date().toISOString(),
            description: "Test migration",
            is_active: true,
          } satisfies IShoppingMallSystematicVersion.IUpdate,
        },
      );
    },
  );
  // Test 3: Invalid version format - non-numeric components
  await TestValidator.error("invalid version format: non-numeric", async () => {
    await api.functional.shoppingMall.superAdmin.versions.putByVersionid(
      authorizedConnection,
      {
        versionId: "123e4567-e89b-12d3-a456-426614174002",
        body: {
          version_number: "abc.def.ghi",
          migration_timestamp: new Date().toISOString(),
          description: "Test migration",
          is_active: true,
        } satisfies IShoppingMallSystematicVersion.IUpdate,
      },
    );
  });
}
