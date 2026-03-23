import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_ban_update_reason_preserving_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for ban updates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Update an existing seller ban record's reason while preserving active status
  // In a real scenario, this would be an existing ban ID; using placeholder for demo
  const banId = "00000000-0000-0000-0000-000000000000";
  const updatedBan = await api.functional.ecommerceMall.admin.user_bans.update(
    adminConnection,
    {
      userBanId: banId,
      body: {
        reason: "Updated investigation findings: confirmed policy violations",
        is_active: true, // Preserve active status
      } satisfies IEcommerceMallUserBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 3. Verify the ban record was updated correctly
  TestValidator.equals(
    "ban reason updated",
    updatedBan.reason,
    "Updated investigation findings: confirmed policy violations",
  );
  TestValidator.equals("active status preserved", updatedBan.isActive, true);
  // 4. Verify seller can still access order processing
  // (This would be tested with seller login which requires additional setup)
}
