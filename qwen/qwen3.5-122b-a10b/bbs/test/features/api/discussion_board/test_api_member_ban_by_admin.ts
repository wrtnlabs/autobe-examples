import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

/**
 * Test the primary success path for an administrator banning a member account.
 * 1) Create an admin account via /discussionBoard/auth/admin/join
 * 2) Create a member account via /discussionBoard/auth/member/join
 * 3) Execute the ban operation with a valid ban reason
 * 4) Verify the member's ban_status is updated to 'banned'
 * 5) Verify the member's ban_reason is set to the provided reason
 * 6) Verify the banned member cannot login (session terminated)
 */
export async function test_api_member_ban_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with tracked credentials
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create admin connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create member account with tracked credentials
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 4. Verify member is initially active
  TestValidator.equals(
    "initial ban_status is active",
    memberJoinResult.ban_status,
    "active",
  );
  TestValidator.equals(
    "initial ban_reason is null",
    memberJoinResult.ban_reason,
    null,
  );
  // 5. Ban the member with admin
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const bannedMember = await api.functional.discussionBoard.admin.members.ban(
    adminConnection,
    {
      memberId: memberJoinResult.id,
      body: { reason: banReason } satisfies IDiscussionBoardMember.IBan,
    },
  );
  typia.assert(bannedMember);
  // 6. Verify ban_status and ban_reason are updated
  TestValidator.equals(
    "ban_status is banned",
    bannedMember.ban_status,
    "banned",
  );
  TestValidator.equals("ban_reason is set", bannedMember.ban_reason, banReason);
  // 7. Verify banned member cannot login (session terminated)
  await TestValidator.httpError("banned member cannot login", 403, async () => {
    const memberLoginConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.member.login.signIn(
      memberLoginConnection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      },
    );
  });
}
