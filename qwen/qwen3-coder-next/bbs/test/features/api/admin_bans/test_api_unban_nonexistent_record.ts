import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_unban_nonexistent_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Attempt to unban a non-existent ban record using a random UUID
  const nonexistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that the system returns appropriate error response
  await TestValidator.httpError(
    "should return 404 for non-existent ban record",
    404,
    async () => {
      await api.functional.discussionBoard.admin.bans.erase(adminConnection, {
        banRecordId: nonexistentBanId,
      });
    },
  );
}
