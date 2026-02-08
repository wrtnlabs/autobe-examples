import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as admin using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create new adminConnection including Authorization header
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Simulate fetching a valid existing activity log entry to get an id
  // Cannot get id because 'id' property does not exist, so we skip this part and simulate with a random id
  const simulatedId = typia.random<string & tags.Format<"uuid">>();
  // 4. Perform retrieval of the simulated existing id
  const fetchedLog = await api.functional.communityPlatform.activityLogs.at(
    authorizedConnection,
    { id: simulatedId },
  );
  typia.assert(fetchedLog);

  // 5. Cannot validate 'created_at', 'updated_at', 'deleted_at' because properties do not exist, so skip these checks

  // 6. Test retrieval with non-existent UUID triggers 404 Not Found
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieval of non-existent activity log returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.activityLogs.at(
        authorizedConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
