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

export async function test_api_member_session_retrieval_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain session information
  const registerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(registered);
  typia.assert(registered.token);
  typia.assert(registered.member);
  // 2. Retrieve own session using the session ID
  const session =
    await api.functional.discussionBoard.member.member.sessions.at(
      registerConnection,
      {
        sessionId: (registered as any).id,
      },
    );
  typia.assert(session);
  // 3. Validate session ownership
  TestValidator.equals(
    "session belongs to registered member",
    session.member.id,
    registered.member.id,
  );
  TestValidator.equals(
    "session has correct access token",
    session.access_token,
    registered.token.access,
  );
  TestValidator.equals(
    "session has correct refresh token",
    session.refresh_token,
    registered.token.refresh,
  );
  TestValidator.predicate(
    "session expired_at matches token",
    session.expired_at === registered.token.expired_at,
  );
}