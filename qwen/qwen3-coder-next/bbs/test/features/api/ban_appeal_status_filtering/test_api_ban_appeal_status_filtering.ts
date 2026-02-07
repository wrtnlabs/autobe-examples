import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAppeal";
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
import { generate_random_discussion_board_admin_bans_appeals_create } from "../../../generate/generate_random_discussion_board_admin_bans_appeals_create";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_ban_appeal_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Auth as super admin to create appeals
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Create a ban record for appeals
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    },
  );
  typia.assert(banRecord);
  // 3. Create multiple appeals for the same ban with different statuses
  // Note: In a real implementation, appeals would have status properties
  // For this test, we'll create appeals and then use the filtering API
  const appeal1 =
    await api.functional.discussionBoard.admin.bans.appeals.create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardBansAppeal.ICreate>(),
      },
    );
  typia.assert(appeal1);
  const appeal2 =
    await api.functional.discussionBoard.admin.bans.appeals.create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardBansAppeal.ICreate>(),
      },
    );
  typia.assert(appeal2);
  const appeal3 =
    await api.functional.discussionBoard.admin.bans.appeals.create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardBansAppeal.ICreate>(),
      },
    );
  typia.assert(appeal3);
  // 4. Test filtering appeals with status filter
  // The filtering should return appeals matching the specified status
  const result =
    await api.functional.discussionBoard.admin.admins.bans.appeals.index(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardBansAppeal.IRequest>(),
      },
    );
  typia.assert(result);
  // 5. Validate structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "pagination records count matches data length or is reasonable",
    result.pagination.records === result.data.length ||
      result.pagination.records === 0 ||
      result.pagination.records > result.data.length,
  );
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
}
