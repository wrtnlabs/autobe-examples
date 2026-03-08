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

export async function test_api_admin_ban_user_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "Admin1234!",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create regular user
  const memberConnection: api.IConnection = { host: connection.host };
  const testEmail = `user_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const userResponse = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: "User1234!",
      display_name: "Regular User",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const bannedUserId = userResponse.id;
  // 3. Admin bans the user with valid reason
  const banRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: bannedUserId,
          ban_reason: "Violating community guidelines by spamming",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban record structure
  TestValidator.equals("user matches", banRecord.user.id, bannedUserId);
  TestValidator.predicate(
    "ban_reason is provided",
    banRecord.ban_reason.length > 0,
  );
  TestValidator.predicate(
    "has valid timestamp",
    new Date(banRecord.banned_at) <= new Date(),
  );
  // 5. Verify banned user cannot log in anymore
  await TestValidator.error("login rejected for banned user", async () => {
    await authorize_member_login(memberConnection, {
      body: {
        email: testEmail,
        password: "User1234!",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
}
