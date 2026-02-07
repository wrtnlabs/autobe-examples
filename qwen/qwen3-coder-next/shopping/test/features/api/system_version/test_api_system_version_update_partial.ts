import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_version_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      name: "Admin User",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Get existing version record using random component name
  const componentName = "core";
  const existingVersion =
    await api.functional.shoppingMall.admin.versions.patchByComponentname(
      adminConnection,
      {
        componentName: componentName,
        body: {
          version_number: "1.0.0",
          description: "Initial version",
          is_active: true,
        } satisfies IShoppingMallSystematicVersion.IUpdate,
      },
    );
  typia.assert(existingVersion);
  const originalCreatedAt = (existingVersion as any).created_at;
  // 3. Update with minimal fields (partial update)
  const updatedVersion =
    await api.functional.shoppingMall.admin.versions.patchByComponentname(
      adminConnection,
      {
        componentName: componentName,
        body: {
          version_number: "2.0.0",
        } satisfies IShoppingMallSystematicVersion.IUpdate,
      },
    );
  typia.assert(updatedVersion);
  // 4. Validate update results
  TestValidator.equals(
    "version number updated",
    (updatedVersion as any).version_number,
    "2.0.0",
  );
  TestValidator.equals(
    "created_at unchanged",
    (updatedVersion as any).created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    (updatedVersion as any).updated_at,
    originalCreatedAt,
  );
}