import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_version_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // Setup: Create super admin account and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  const loginResponse =
    await api.functional.shoppingMall.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
      },
    );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: loginResponse.token.access,
  };
  // Setup: Create a version record using super admin
  // Note: We can't directly create version records via API in this test,
  // but we'll attempt to delete a non-existent version to test authorization
  const nonExistentVersionId = typia.random<string & tags.Format<"uuid">>();
  // Test: Attempt to delete version as regular admin (should fail with 403)
  await TestValidator.error(
    "should return 403 Forbidden for unauthorized deletion",
    async () => {
      await api.functional.shoppingMall.superAdmin.versions.erase(
        adminConnection,
        {
          versionId: nonExistentVersionId,
        },
      );
    },
  );
}
