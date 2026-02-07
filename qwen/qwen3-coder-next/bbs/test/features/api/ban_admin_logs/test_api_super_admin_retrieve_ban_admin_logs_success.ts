import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAdminLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieve_ban_admin_logs_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Call the endpoint to retrieve ban admin logs
  const result: IPageIDiscussionBoardBansAdminLog.ISummary =
    await api.functional.discussionBoard.superAdmin.bans.admin_logs.index(
      superAdminConnection,
    );
  // Validate the response structure and pagination
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
}
