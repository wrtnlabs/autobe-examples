import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_ban_management_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinData = typia.random<IDiscussionBoardMember.IJoin>();
  const memberSession = await authorize_member_join(memberConnection, {
    body: memberJoinData,
  });
  typia.assert(memberSession);
  // 2. Login as member to establish session before banning
  const memberLoginData = typia.random<IDiscussionBoardMember.ILogin>();
  await authorize_member_login(memberConnection, {
    body: memberLoginData,
  });
  // 3. Login as admin to have permission to ban users
  const adminConnection: api.IConnection = { host: connection.host };
  const adminSession = await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  typia.assert(adminSession);
  // 4. Execute ban operation
  const banResult = await api.functional.discussionBoard.admin.bans.ban(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.IRequest>(),
    },
  );
  typia.assert(banResult);
  // 5. Verify ban by attempting to login with banned member credentials
  await TestValidator.error("banned member cannot login", async () => {
    const bannedMemberConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(bannedMemberConnection, {
      body: memberLoginData, // Use actual credentials
    });
  });
  // 6. Unban the member
  const unbanResult = await api.functional.discussionBoard.admin.bans.ban(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.IRequest>(),
    },
  );
  typia.assert(unbanResult);
  // 7. Verify member can login after being unbanned
  const restoredMemberSession = await authorize_member_login(memberConnection, {
    body: memberLoginData, // Use same credentials
  });
  typia.assert(restoredMemberSession);
}
