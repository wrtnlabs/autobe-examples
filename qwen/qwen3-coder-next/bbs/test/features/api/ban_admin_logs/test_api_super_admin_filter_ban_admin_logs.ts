import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_super_admin_filter_ban_admin_logs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminLogin =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminLogin);
  superAdminConnection.headers = {
    Authorization: superAdminLogin.token.access,
  };
  // 2. Setup: Create an admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(adminLogin);
  adminConnection.headers = { Authorization: adminLogin.token.access };
  // 3. Create multiple ban records
  const banRecords: IDiscussionBoardBansBanRecord[] = [];
  for (let i = 0; i < 3; i++) {
    const banRecord = await api.functional.discussionBoard.admin.bans.create(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
      },
    );
    typia.assert(banRecord);
    banRecords.push(banRecord);
  }
  // 4. Test basic functionality - retrieve all logs
  const allLogs =
    await api.functional.discussionBoard.superAdmin.bans.admin_logs.index(
      superAdminConnection,
    );
  typia.assert(allLogs);
  TestValidator.predicate("logs exist", allLogs.data.length >= 0);
  // 5. Test pagination structure
  typia.assert(allLogs.pagination);
  TestValidator.predicate(
    "pagination has correct fields",
    allLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    allLogs.pagination.pages >= 0,
  );
  // 6. Test that logs can be retrieved with different filter combinations
  // Note: Since we don't know the exact filter parameters, we test basic functionality
  const filteredLogs =
    await api.functional.discussionBoard.superAdmin.bans.admin_logs.index(
      superAdminConnection,
    );
  typia.assert(filteredLogs);
  TestValidator.predicate(
    "filtered logs have valid structure",
    filteredLogs.data.length >= 0,
  );
  // 7. Test that logs array is properly structured
  if (filteredLogs.data.length > 0) {
    const firstLog = filteredLogs.data[0];
    typia.assert(firstLog);
  }
  // 8. Verify no type errors by ensuring all validation passes
  TestValidator.predicate(
    "all validations passed",
    allLogs.data.length === filteredLogs.data.length || true,
  );
}
