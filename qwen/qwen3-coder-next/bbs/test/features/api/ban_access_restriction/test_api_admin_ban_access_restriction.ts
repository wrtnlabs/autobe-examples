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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_admin_ban_access_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // IDiscussionBoardAdmin.IJoin has no required fields currently
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member login to establish session
  await authorize_member_login(memberConnection, {
    body: {
      // IDiscussionBoardMember.ILogin has no required fields currently
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Admin bans the member
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        // IDiscussionBoardBansBanRecord.ICreate has no required fields currently
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 5. Verify banned user cannot log in (should fail)
  await TestValidator.error("banned user cannot login", async () => {
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: {
        // IDiscussionBoardMember.ILogin has no required fields currently
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  // 6. Verify ban record has expected structure
  TestValidator.predicate(
    "ban record has valid structure",
    banRecord !== null && banRecord !== undefined,
  );
}
