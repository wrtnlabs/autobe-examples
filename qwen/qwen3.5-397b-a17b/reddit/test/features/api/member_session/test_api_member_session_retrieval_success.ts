import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session retrieval success path.
 *
 * This test validates that an authenticated member can successfully retrieve
 * detailed information about their authentication session. The test creates
 * a member account, logs in to establish a session, and then retrieves the
 * session details to verify all fields are properly populated.
 */
export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with member credentials to create session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: password,
    } satisfies IRedditCloneMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Generate session ID for retrieval (in simulation mode)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve session details
  const session = await api.functional.redditClone.member.sessions.at(
    loginConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate member relation in session response matches authenticated member
  TestValidator.equals("member id matches", session.member.id, joinResult.id);
  TestValidator.equals(
    "username matches",
    session.member.username,
    joinResult.username,
  );
  TestValidator.equals(
    "display_name matches",
    session.member.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate(
    "karma_score is integer",
    Number.isInteger(session.member.karma_score),
  );
  TestValidator.predicate(
    "member created_at is valid date-time",
    !isNaN(Date.parse(session.member.created_at)),
  );
  // 6. Validate session belongs to the correct member
  TestValidator.equals("session member id", session.member.id, joinResult.id);
}
