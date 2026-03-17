import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_profile_email_conflict_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register Admin A — email will be used as conflict target
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAResult = await authorize_admin_join(adminAConnection, {
    body: {
      email: adminAEmail,
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAResult);
  // 3. Register Admin B — this is the admin whose profile will be updated
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBResult = await authorize_admin_join(adminBConnection, {
    body: {
      email: adminBEmail,
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminBResult);
  const adminBId = adminBResult.id;
  // 4. Conflict scenario: Super admin tries to update Admin B's email to Admin A's email
  // Expect 409 Conflict
  await TestValidator.httpError(
    "update admin email to already-used email should fail with 409",
    409,
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.update(
        superAdminConnection,
        {
          adminId: adminBId,
          body: {
            email: adminAEmail,
          } satisfies IShoppingMallAdmin.IUpdate,
        },
      );
    },
  );
  // 5. Same email update: Super admin updates Admin B with Admin B's own current email
  // This should succeed (200 OK)
  const updatedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: adminBId,
        body: {
          email: adminBEmail,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // 6. Validate that Admin B's email is still the original email
  TestValidator.equals(
    "Admin B email remains unchanged after failed conflict update",
    updatedAdmin.email,
    adminBEmail,
  );
}
