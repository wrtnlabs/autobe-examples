import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID to test log retrieval
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve a system log entry (no auth required per @x-autobe-authorization-type null)
  const log = await api.functional.discussionBoard.superAdmin.logs.at(
    connection,
    { logId },
  );
  typia.assert(log);
  // Verify log structure
  TestValidator.predicate("log exists", log !== null && log !== undefined);
}
