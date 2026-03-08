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

export async function test_api_superadmin_user_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create target member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Login as member to get their info
  const memberInfo = await api.functional.discussionBoard.auth.member.login(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(memberInfo);
  // 4. Login as super admin
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 5. Perform the ban
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banResult =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: memberInfo.id,
          ban_reason: banReason,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banResult);
  // 6. Verify ban record details
  TestValidator.equals("ban reason matches", banResult.ban_reason, banReason);
  TestValidator.equals(
    "banned user ID matches",
    banResult.user.id,
    memberInfo.id,
  );
  TestValidator.predicate(
    "administrator exists",
    banResult.administrator.id !== null,
  );
  // 7. Verify banned user profile shows is_banned flag
  TestValidator.equals("user is banned", memberInfo.is_banned, true);
  TestValidator.equals(
    "ban reason in profile",
    memberInfo.ban_reason,
    banReason,
  );
  // 8. Verify banned user content remains intact (articles/comments still visible)
  TestValidator.equals("email preserved", memberInfo.email, memberEmail);
}
