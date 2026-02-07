import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfigHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_config_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Retrieve configuration history with pagination
  const history =
    await api.functional.discussionBoard.admin.config_history.index(
      adminConnection,
    );
  typia.assert(history);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", history.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has non-negative records",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    history.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("has data array", Array.isArray(history.data));
  // 5. Validate configuration history records if any exist
  if (history.data.length > 0) {
    // Check first record structure
    const firstRecord = history.data[0];
    typia.assert(firstRecord);
  }
}
