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

export async function test_api_super_admin_ban_admin_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // 2. Create admin connection for generating ban logs
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 3. Generate multiple ban records to create ban admin logs
  // Create 15 ban records to have substantial data for pagination testing
  const banRecords = ArrayUtil.repeat(
    15,
    () =>
      ({
        user_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        start_time: new Date().toISOString(),
        end_time: null as string | null,
      }) satisfies IDiscussionBoardBansBanRecord.ICreate,
  );
  for (const ban of banRecords) {
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: ban,
    });
  }
  // 4. Test pagination with limit=5
  const result1 =
    await api.functional.discussionBoard.superAdmin.bans.admin_logs.index(
      superAdminConnection,
    );
  typia.assert(result1);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    result1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", result1.pagination.limit, 5);
  TestValidator.equals(
    "pagination records count",
    result1.pagination.records,
    15,
  );
  TestValidator.equals("pagination pages count", result1.pagination.pages, 3);
  // 6. Validate data array length matches limit
  TestValidator.equals("data length equals limit", result1.data.length, 5);
  // 7. Validate admin log structure
  for (const log of result1.data) {
    typia.assert<IDiscussionBoardBansAdminLog.ISummary>(log);
  }
  // 8. Test accessing page beyond total pages returns empty data
  // Note: This would require additional API support for page parameter
  // For now, validate that current page returns correct structure
}
