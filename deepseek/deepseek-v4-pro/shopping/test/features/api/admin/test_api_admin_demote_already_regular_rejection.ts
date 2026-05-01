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
 * Test that demoting an already-regular administrator is rejected with 400.
 *
 * Validates the safeguard preventing super administrators from demoting a
 * target administrator who already holds the "regular" grade. Since "regular"
 * is the lowest administrator authority level, further demotion is semantically
 * impossible and must be blocked by the system.
 *
 * 1. Super administrator registers and authenticates via join.
 * 2. A second target administrator registers via join, defaulting to "regular".
 * 3. Verify the target's grade is confirmed as "regular".
 * 4. Super administrator attempts to demote the regular target.
 * 5. System rejects the request with a 400 Bad Request error.
 */
export async function test_api_admin_demote_already_regular_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the acting super administrator
  const superConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superConnection, {});
  typia.assert(superAdmin);
  // 2. Create the target administrator (defaults to regular grade)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetConnection, {});
  typia.assert(targetAdmin);
  // 3. Confirm target is at the regular grade before attempting demotion
  TestValidator.equals("target grade is regular", targetAdmin.grade, "regular");
  // 4. Attempt to demote the already-regular admin — must be rejected
  await TestValidator.httpError(
    "demote already-regular admin should be rejected",
    400,
    async () =>
      await api.functional.shoppingMall.admin.admins.demote(superConnection, {
        adminId: targetAdmin.id,
      }),
  );
}
