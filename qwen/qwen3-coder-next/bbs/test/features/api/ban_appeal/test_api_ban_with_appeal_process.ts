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

export async function test_api_ban_with_appeal_process(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Login as admin to get admin credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // 3. Ban the member with a reason
  const banResponse = await api.functional.discussionBoard.admin.bans.ban(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.IRequest>(),
    },
  );
  typia.assert(banResponse);
  // 4. Login as banned member to verify access is denied
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("access denied for banned member", async () => {
    await api.functional.discussionBoard.auth.member.login(
      bannedMemberConnection,
      {
        body: typia.random<IDiscussionBoardMember.ILogin>(),
      },
    );
  });
  // 5. Submit an appeal against the ban
  const appealResponse = await api.functional.discussionBoard.admin.bans.ban(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardBansBanRecord.IRequest>(),
    },
  );
  typia.assert(appealResponse);
  // 6. Process the appeal by an administrator
  const processAppealResponse =
    await api.functional.discussionBoard.admin.bans.ban(adminConnection, {
      body: typia.random<IDiscussionBoardBansBanRecord.IRequest>(),
    });
  typia.assert(processAppealResponse);
  // 7. Verify the appeal result and access restoration
  const restoredMemberConnection: api.IConnection = { host: connection.host };
  const restoredResponse =
    await api.functional.discussionBoard.auth.member.login(
      restoredMemberConnection,
      {
        body: typia.random<IDiscussionBoardMember.ILogin>(),
      },
    );
  typia.assert(restoredResponse);
}
