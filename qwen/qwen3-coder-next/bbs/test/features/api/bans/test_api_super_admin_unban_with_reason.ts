import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_super_admin_unban_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(bannedUser);
  // 2. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(superAdmin);
  // 3. Create ban record with reason
  const banRecord = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminConnection,
    {
      body: {
        ban_reason: "Security violation",
        discussion_board_member_id: bannedUser.id,
        administrator_id: superAdmin.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  TestValidator.equals(
    "ban reason set",
    banRecord.ban_reason,
    "Security violation",
  );
  TestValidator.notEquals("banned_at is set", banRecord.banned_at, null);
  TestValidator.equals(
    "unbanned_at is null initially",
    banRecord.unbanned_at,
    null,
  );
  TestValidator.equals(
    "unban_reason is null initially",
    banRecord.unban_reason,
    undefined,
  );
  // 4. Verify ban record was created
  const banId = banRecord.id;
  TestValidator.equals("ban ID matches", banRecord.id, banId);
  // 5. Unban the user with optional unban reason
  await api.functional.discussionBoard.superAdmin.bans.erase(
    superAdminConnection,
    {
      banId,
    },
  );
  // 6. Verify user can log in after unban
  const loginResponse = await api.functional.discussionBoard.auth.member.login(
    userConnection,
    {
      body: {
        email: bannedUser.email,
        password: "1234",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "user is not banned after unban",
    loginResponse.is_banned,
    false,
  );
  TestValidator.equals(
    "ban reason is null after unban",
    loginResponse.ban_reason,
    null,
  );
}
