import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_version_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // 2. Create a version record (using the API directly since no utility exists for creation)
  // Since we don't have a create version endpoint, we'll use a generated random version ID
  // and attempt to delete it. This tests the deletion endpoint functionality.
  const versionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the version record
  const deleteResponse =
    await api.functional.shoppingMall.superAdmin.versions.erase(
      superAdminConnection,
      {
        versionId: versionId,
      },
    );
  typia.assert(deleteResponse);
  // 4. Verify the HTTP 204 No Content response
  TestValidator.equals("response is void", typeof deleteResponse, "undefined");
}
