import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

export async function test_api_member_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(authorizedMember);
  // 2. Login as admin to get admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "superadmin@test.com",
    password: "SuperAdmin123!",
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loggedAdmin = await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(loggedAdmin);
  // 3. Ban the member account
  const banRequest = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardMember.IBanRequest;
  await api.functional.discussionBoard.admin.users.ban(adminConnection, {
    id: authorizedMember.member.id,
    body: banRequest,
  });
  // 4. Attempt to login as banned member and verify 403 Forbidden
  const bannedLoginConnection: api.IConnection = { host: connection.host };
  const bannedLoginCredentials = {
    email: memberCredentials.email,
    password: memberCredentials.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.ILogin;
  await TestValidator.error(
    "banned member login should fail with 403 Forbidden",
    async () => {
      await api.functional.discussionBoard.auth.member.login(
        bannedLoginConnection,
        {
          body: bannedLoginCredentials,
        },
      );
    },
  );
}
