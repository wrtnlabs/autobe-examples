import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval_other_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  // Register two members with unique credentials
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  // Login member1 to create session
  const loginMember1 = await authorize_member_login(member1Connection, {
    body: {
      email: member1.member.email,
      password: member1Connection.headers?.["authorization"] as string,
      href: "",
      referrer: "",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginMember1);
  // Login member2 to create session
  const loginMember2 = await authorize_member_login(member2Connection, {
    body: {
      email: member2.member.email,
      password: member2Connection.headers?.["authorization"] as string,
      href: "",
      referrer: "",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginMember2);
  // Get member2's session details
  const session2 =
    await api.functional.discussionBoard.member.member.sessions.at(
      member2Connection,
      {
        sessionId: loginMember2.token.access,
      },
    );
  typia.assert(session2);
  // Verify member1 CAN access their own session first (sanity check)
  const session1 =
    await api.functional.discussionBoard.member.member.sessions.at(
      member1Connection,
      {
        sessionId: loginMember1.token.access,
      },
    );
  typia.assert(session1);
  // Member1 attempts to access member2's session - should be forbidden (403)
  await TestValidator.error(
    "member1 cannot access member2's session",
    async () => {
      await api.functional.discussionBoard.member.member.sessions.at(
        member1Connection,
        {
          sessionId: session2.id,
        },
      );
    },
  );
}