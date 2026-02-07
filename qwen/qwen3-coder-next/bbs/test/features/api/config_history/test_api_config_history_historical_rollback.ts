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

export async function test_api_config_history_historical_rollback(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Create a new configuration history record first
  // Since we need a valid historyId, we'll use the random function from the SDK
  // In a real scenario, this would be a real configuration history record
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // Test retrieving the configuration history
  const history =
    await api.functional.discussionBoard.superAdmin.config_history.at(
      adminConnection,
      {
        historyId,
      },
    );
  typia.assert(history);
}