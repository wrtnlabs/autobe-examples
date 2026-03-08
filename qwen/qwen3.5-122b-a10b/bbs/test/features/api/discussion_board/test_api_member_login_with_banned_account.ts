import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_member_login_with_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoined = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberJoined);
  // 2. Create admin account and login
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminJoined);
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const adminLoggedIn = await authorize_admin_login(adminConnection, {
    body: adminLoginInput,
  });
  typia.assert(adminLoggedIn);
  // 3. Ban the member account
  const banReason = "Violation of community guidelines";
  const banRecord =
    await api.functional.discussionBoard.admin.admin.bans.create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: memberJoined.id,
          reason: banReason,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban record contains correct information
  TestValidator.equals("ban reason matches", banRecord.reason, banReason);
  TestValidator.equals(
    "member ID matches",
    banRecord.discussion_board_member_id,
    memberJoined.id,
  );
  // 5. Attempt login with banned member's credentials
  const memberLoginInput = {
    email: memberJoinInput.email,
    password: memberJoinInput.password,
  } satisfies IDiscussionBoardMember.ILogin;
  // 6. Verify login is rejected with authentication error
  await TestValidator.error("banned member cannot login", async () => {
    await authorize_member_login(memberConnection, {
      body: memberLoginInput,
    });
  });
}
