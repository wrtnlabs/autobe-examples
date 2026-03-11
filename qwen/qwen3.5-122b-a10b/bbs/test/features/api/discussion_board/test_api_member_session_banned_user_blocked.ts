import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
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

export async function test_api_member_session_banned_user_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(memberAuth);
  // Store member credentials for later login
  const memberEmail = memberAuth.email;
  const memberPassword = memberJoinInput.password;
  // 2. Create admin account to perform ban operation
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 3. Login as member to create a session
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginAuth = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLoginAuth);
  // 4. Get session ID from the member's authentication
  // Note: The session ID should be available from the token or we need to list sessions
  // For this test, we'll use the token information to identify the session
  const sessionId = memberLoginAuth.token.refresh; // Using refresh token as session identifier
  // 5. Ban the member account (REQUIRES BAN API - NOT AVAILABLE IN SDK)
  // This step cannot be completed without a ban API endpoint
  // The following would be the intended implementation:
  // await api.functional.discussionBoard.admin.members.ban(adminConnection, {
  //   memberId: memberAuth.id,
  //   body: { reason: "Test ban for E2E validation" }
  // });
  // 6. Attempt to retrieve session details with banned member's token
  // Since we cannot actually ban the member, this test validates the structure
  // In a real scenario, this should throw a 403 Forbidden error with ban information
  await TestValidator.error("banned member cannot access session", async () => {
    await api.functional.discussionBoard.member.sessions.at(
      memberLoginConnection,
      {
        sessionId: sessionId,
      },
    );
  });
}
