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

export async function test_api_super_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 3. Super admin logs in to get authorization
  const superAdminAuthConnection: api.IConnection = { host: connection.host };
  const superAdminLogin =
    await api.functional.discussionBoard.auth.superAdmin.login(
      superAdminAuthConnection,
      {
        body: {
          email: superAdmin.email,
          password: "testPassword123!",
        } satisfies IDiscussionBoardSuperAdmin.ILogin,
      },
    );
  typia.assert(superAdminLogin);
  // 4. Super admin bans the member
  const banRecord = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminAuthConnection,
    {
      body: {
        ban_reason: "Violated community guidelines - spamming",
        discussion_board_member_id: member.id,
        administrator_id: superAdminLogin.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  TestValidator.equals("ban record has member", banRecord.user.id, member.id);
  TestValidator.equals(
    "ban record has reason",
    banRecord.ban_reason,
    "Violated community guidelines - spamming",
  );
  TestValidator.predicate("ban is active", banRecord.banned_at !== null);
  // 5. Verify user is banned (login should fail)
  const memberConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("banned user cannot login", async () => {
    await api.functional.discussionBoard.auth.member.login(memberConnection2, {
      body: {
        email: member.email,
        password: "testPassword123!",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  // 6. Super admin unban the user
  await api.functional.discussionBoard.superAdmin.bans.erase(
    superAdminAuthConnection,
    {
      banId: banRecord.id,
    },
  );
  // 7. Verify user can login again (unbanned)
  const memberConnection3: api.IConnection = { host: connection.host };
  const memberAfterUnban =
    await api.functional.discussionBoard.auth.member.login(memberConnection3, {
      body: {
        email: member.email,
        password: "testPassword123!",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberAfterUnban);
  TestValidator.equals(
    "user email matches after unban",
    memberAfterUnban.email,
    member.email,
  );
  TestValidator.predicate(
    "user is not banned after unban",
    memberAfterUnban.is_banned === false,
  );
  TestValidator.equals("user role preserved", memberAfterUnban.role, "member");
}
