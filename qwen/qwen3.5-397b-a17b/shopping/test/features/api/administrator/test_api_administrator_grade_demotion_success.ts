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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_grade_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin (actor who will perform demotion)
  const actorSuperAdmin = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(actorSuperAdmin);
  // 2. Create second super admin (target who will be demoted)
  const targetSuperAdmin = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(targetSuperAdmin);
  // 3. Create connection for actor super admin (already authenticated from join)
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = {
    Authorization: `Bearer ${actorSuperAdmin.token.access}`,
  };
  // 4. Demote the target super admin to regular admin
  const demotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.demote(
      actorConnection,
      {
        adminId: targetSuperAdmin.id,
      },
    );
  typia.assert(demotedAdmin);
  // 5. Verify the demoted admin has ADMIN grade (not SUPER_ADMIN)
  TestValidator.equals("grade changed to ADMIN", demotedAdmin.grade, "ADMIN");
  // 6. Verify the demoted admin's ID matches target
  TestValidator.equals(
    "admin ID matches",
    demotedAdmin.id,
    targetSuperAdmin.id,
  );
  // 7. Verify the demoted admin's email matches target
  TestValidator.equals(
    "email matches",
    demotedAdmin.email,
    targetSuperAdmin.email,
  );
  // 8. Verify updated_at timestamp is present
  TestValidator.predicate(
    "updated_at exists",
    demotedAdmin.updated_at !== null,
  );
  // 9. Verify created_at is present
  TestValidator.predicate(
    "created_at exists",
    demotedAdmin.created_at !== null,
  );
  // 10. Verify deleted_at is null (account is active)
  TestValidator.equals("account is active", demotedAdmin.deleted_at, null);
}
