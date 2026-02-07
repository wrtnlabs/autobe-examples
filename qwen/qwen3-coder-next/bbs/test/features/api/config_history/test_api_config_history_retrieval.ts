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

export async function test_api_config_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // Generate valid UUID for history record
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve configuration history record
  const configHistory =
    await api.functional.discussionBoard.superAdmin.config_history.at(
      adminConnection,
      {
        historyId,
      },
    );
  // Validate response structure
  typia.assert<IDiscussionBoardSystemConfigHistory>(configHistory);
}
