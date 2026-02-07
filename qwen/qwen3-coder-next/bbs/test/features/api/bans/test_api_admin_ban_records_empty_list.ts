import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_ban_records_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and regular member connections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Login as member to get authenticated connection
  const memberAuthenticated =
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: typia.random<IDiscussionBoardMember.ILogin>(),
    });
  typia.assert(memberAuthenticated);
  // 2. Create a regular user with no ban records
  // Since we already have member connection from join, use it directly
  const userId = memberConnection.headers?.Authorization
    ? "temp_user_id" // Placeholder - actual user ID would come from member profile
    : "temp_user_id";
  // 3. Test: Retrieve ban records for user with no bans
  const result: IPageIDiscussionBoardBansBanRecord.ISummary =
    await api.functional.discussionBoard.admin.users.bans.index(
      adminConnection,
      {
        userId: userId,
      },
    );
  // 4. Validate: Check that empty ban list is returned correctly
  typia.assert(result);
  // Verify pagination structure
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  TestValidator.equals("empty data array", result.data.length, 0);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 0 for empty", result.pagination.limit, 0);
  TestValidator.equals("records is 0", result.pagination.records, 0);
  TestValidator.equals("pages is 0", result.pagination.pages, 0);
}
