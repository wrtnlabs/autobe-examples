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
 * Test that a regular administrator cannot promote another administrator.
 *
 * Validates that the promotion endpoint enforces super administrator authorization by verifying that a regular administrator receives a 403 Forbidden response when attempting to promote another administrator. This ensures the grade-based access control on the promote operation functions correctly.
 *
 * 1. Register and authenticate a regular administrator via join.
 * 2. Register and authenticate a second regular administrator as the promotion target.
 * 3. The first regular administrator attempts to promote the second administrator.
 * 4. Verify the call returns HTTP 403 Forbidden — only super administrators are authorized.
 */
export async function test_api_admin_promotion_regular_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a regular administrator (the unauthorized actor)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {});
  typia.assert(regularAdmin);
  // 2. Register a second regular administrator (the promotion target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetConnection, {});
  typia.assert(targetAdmin);
  // 3. Regular administrator attempts to promote the target — expect 403 Forbidden
  await TestValidator.httpError(
    "regular administrator cannot promote another admin",
    403,
    async () =>
      await api.functional.shoppingMall.admin.admins.promote(
        regularAdminConnection,
        { adminId: targetAdmin.id },
      ),
  );
  // 4. Verify the target administrator's grade remains unchanged (still "regular")
  TestValidator.equals(
    "target admin grade unchanged",
    targetAdmin.grade,
    "regular",
  );
}
