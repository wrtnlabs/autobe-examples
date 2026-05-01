import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Verify that attempting to promote an already-super administrator returns 409 Conflict.
 *
 * Tests the promotion endpoint's grade validation logic by attempting to promote
 * a target administrator who already holds the 'super' grade. The specification
 * states that promotion is only applicable to regular administrators, so an
 * already-super admin cannot be promoted again.
 *
 * 1. A super administrator authenticates via join.
 * 2. A target administrator is created and promoted to the super grade.
 * 3. The super administrator attempts to promote the already-super target again.
 * 4. The API returns 409 Conflict, confirming the promotion was rejected.
 */
export async function test_api_admin_promotion_already_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create target administrator
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {});
  typia.assert(targetAdmin);
  // 3. Promote target to super grade
  const promoted = await api.functional.shoppingMall.admin.admins.promote(
    superAdminConnection,
    { adminId: targetAdmin.id },
  );
  typia.assert(promoted);
  TestValidator.equals("promoted grade is super", promoted.grade, "super");
  // 4. Attempt to promote already-super admin → expect 409 Conflict
  await TestValidator.httpError(
    "already super admin promotion rejected",
    409,
    async () => {
      await api.functional.shoppingMall.admin.admins.promote(
        superAdminConnection,
        { adminId: targetAdmin.id },
      );
    },
  );
}
