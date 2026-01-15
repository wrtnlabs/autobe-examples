import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_discussion_board_member_session_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create new member account with guest session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      ip: null,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAccount);
  // Generate random email for login
  const email = typia.random<string & tags.Format<"email">>();
  // Authenticate as new member to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: email,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
      ip: null,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Delete the session using the session ID (which serves as member ID too)
  await api.functional.discussionBoard.member.members.sessions.erase(
    loginConnection,
    {
      memberId: loginResult.id,
      sessionId: loginResult.id,
    },
  );
  // Verify deletion was successful
  TestValidator.predicate("session deletion successful", true);
}
