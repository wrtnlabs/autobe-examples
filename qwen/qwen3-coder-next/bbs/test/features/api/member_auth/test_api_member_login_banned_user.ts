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

export async function test_api_member_login_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "12345678";
  const memberAuthorized =
    await api.functional.discussionBoard.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberAuthorized);
  // 2. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin1234";
  const adminAuthorized = await api.functional.discussionBoard.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: "Test Admin",
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuthorized);
  // 3. Ban the member using admin connection
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  const banRequest: IDiscussionBoardBanRecord.IRequest = {
    discussion_board_member_id: memberAuthorized.id,
    ban_reason: "Violating community guidelines",
  };
  const banRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      adminConnection,
      {
        body: banRequest,
      },
    );
  typia.assert(banRecord);
  // 4. Verify the member is banned and attempt login
  TestValidator.equals(
    "ban record created",
    banRecord.ban_reason,
    "Violating community guidelines",
  );
  TestValidator.equals(
    "banned user matches",
    banRecord.user.id,
    memberAuthorized.id,
  );
  // 5. Attempt to login as banned member using fresh connection - should fail
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login fails for banned user", async () => {
    await api.functional.discussionBoard.auth.member.login(
      bannedMemberConnection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      },
    );
  });
}
