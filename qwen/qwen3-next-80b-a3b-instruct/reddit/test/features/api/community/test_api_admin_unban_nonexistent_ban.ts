import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_unban_nonexistent_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to obtain authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Attempt to unban a non-existent ban record
  // Use a random UUID that definitely doesn't exist in the system
  const nonexistentBanId = typia.random<string & tags.Format<"uuid">>();
  // Since the ban record doesn't exist, the system should return HTTP 404 Not Found
  // We use TestValidator.error to validate that the endpoint throws the expected error
  await TestValidator.error("unban non-existent ban returns 404", async () => {
    await api.functional.community.admin.bans.erase(adminConnection, {
      banId: nonexistentBanId,
    });
  });
}
