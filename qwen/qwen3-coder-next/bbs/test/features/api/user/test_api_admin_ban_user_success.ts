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

export async function test_api_admin_ban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminAuth);
  // Update adminConnection with admin's access token
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Create target user and get their credentials
  const userConnection: api.IConnection = { host: connection.host };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinInput = {
    email: userEmail,
    password: userPassword,
    displayName: RandomGenerator.name(),
    passwordConfirmation: userPassword,
  } satisfies IDiscussionBoardMember.IJoin;
  const userAuth = await api.functional.discussionBoard.auth.member.join(
    userConnection,
    {
      body: userJoinInput,
    },
  );
  typia.assert(userAuth);
  const userId = userAuth.member.id;
  // Update userConnection with user's access token for verification
  userConnection.headers = { Authorization: userAuth.token.access };
  // 3. Admin bans the target user
  const banReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 15,
  });
  const banRequest = {
    reason: banReason,
  } satisfies IDiscussionBoardMember.IBanRequest;
  await api.functional.discussionBoard.admin.users.ban(adminConnection, {
    id: userId,
    body: banRequest,
  });
  // 4. Verify banned user cannot authenticate (login should fail)
  const loginInput = {
    email: userEmail,
    password: userPassword,
    href: "https://example.com",
    referrer: "https://referrer.com",
  } satisfies IDiscussionBoardMember.ILogin;
  await TestValidator.error("banned user cannot login", async () => {
    await api.functional.discussionBoard.auth.member.login(userConnection, {
      body: loginInput,
    });
  });
}
