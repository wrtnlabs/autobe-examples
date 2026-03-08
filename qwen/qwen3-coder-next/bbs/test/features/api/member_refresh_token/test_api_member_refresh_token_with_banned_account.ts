import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function test_api_member_refresh_token_with_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminName,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberName = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoined = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberName,
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberJoined);
  // 4. Login as member to get refresh token
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoggedIn = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLoggedIn);
  const refreshToken = memberLoggedIn.token.refresh;
  // 5. Ban the member account
  const banRequestConnection: api.IConnection = { host: connection.host };
  const bannedRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      banRequestConnection,
      {
        body: {
          discussion_board_member_id: memberLoggedIn.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(bannedRecord);
  // 6. Verify banned member's profile shows is_banned = true
  TestValidator.equals("member is banned", memberLoggedIn.is_banned, true);
  TestValidator.predicate(
    "ban_reason should be set for banned member",
    () => memberLoggedIn.ban_reason !== null,
  );
  // 7. Attempt to refresh token with banned account - should fail
  await TestValidator.error(
    "refresh token should be rejected for banned account",
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.member.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: refreshToken,
          } satisfies IDiscussionBoardMember.IRefresh,
        },
      );
    },
  );
}
