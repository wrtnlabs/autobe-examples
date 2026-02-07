import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAdminLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_bans_admin_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login setup
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 2. Retrieve ban admin logs
  const result: IPageIDiscussionBoardBansAdminLog =
    await api.functional.discussionBoard.admin.bans.admin_logs.get(
      adminConnection,
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.predicate("pagination exists", result.pagination !== null);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "has valid pagination",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("has valid limit", result.pagination.limit >= 0);
}
