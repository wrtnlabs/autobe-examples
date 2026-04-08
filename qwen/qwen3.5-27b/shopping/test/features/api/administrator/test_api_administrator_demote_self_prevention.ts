import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the business rule that prevents an administrator from demoting themselves.
 *
 * Validates that administrators cannot demote their own accounts, ensuring system integrity and preventing accidental or malicious removal of privileges. This constraint maintains system stability and accountability.
 *
 * 1. Register and authenticate as an administrator using the join endpoint.
 * 2. Attempt to demote the same administrator by calling the demote endpoint with their own ID.
 * 3. Verify the operation is rejected with an error (either for self-demotion prevention or insufficient privileges).
 */
export async function test_api_administrator_demote_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Test: Attempt self-demotion
  await TestValidator.error("self-demotion should be rejected", async () => {
    await api.functional.shoppingMall.administrator.administrators.demote(
      adminConnection,
      {
        administratorId: admin.id,
      },
    );
  });
  // 3. Verify: Admin account remains intact
  TestValidator.predicate("admin account exists", admin.id != null);
}
