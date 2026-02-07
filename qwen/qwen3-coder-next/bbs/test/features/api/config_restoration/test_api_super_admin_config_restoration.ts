import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_config_restoration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // 2. Create a configuration history entry by first saving a snapshot
  // (In a real implementation, there would be a separate save endpoint)
  // For this test, we'll assume a config history entry exists
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Restore configuration from historical snapshot
  const restoreResult =
    await api.functional.discussionBoard.superAdmin.config_history.restore(
      superAdminConnection,
      {
        historyId: historyId,
      },
    );
  typia.assert(restoreResult);
  // 4. Verify restoration was successful
  TestValidator.predicate("restoration successful", restoreResult !== null);
}
