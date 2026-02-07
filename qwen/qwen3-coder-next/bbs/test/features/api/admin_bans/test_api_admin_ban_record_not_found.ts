import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin session for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Try to retrieve a non-existent ban record with a random UUID
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // Should return 404 Not Found error for non-existent ban record
  await TestValidator.httpError(
    "non-existent ban record should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.bans.at(adminConnection, {
        banRecordId: nonExistentBanId,
      });
    },
  );
}
