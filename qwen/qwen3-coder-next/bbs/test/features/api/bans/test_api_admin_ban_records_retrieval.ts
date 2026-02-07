import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_admin_ban_records_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by registering as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(adminAuthorized);
  // 2. Generate random user ID for testing
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a ban record for the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.ICreate>(),
    },
  );
  typia.assert(banRecord);
  // 4. Retrieve ban records for the user
  const banRecords =
    await api.functional.discussionBoard.admin.users.bans.index(
      adminConnection,
      {
        userId: userId,
      },
    );
  typia.assert(banRecords);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination exists",
    banRecords.pagination !== null,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(banRecords.data));
}
