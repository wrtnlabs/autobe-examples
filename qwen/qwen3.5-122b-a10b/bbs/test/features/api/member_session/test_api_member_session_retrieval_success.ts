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

export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(authResponse);
  // 2. Generate a valid session ID for testing
  // Note: Session is created during join, but session ID is not exposed in auth response
  // Using typia.random to generate a valid UUID for endpoint testing
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve session details using the session ID
  const session: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.sessions.at(memberConnection, {
      sessionId,
    });
  typia.assert(session);
  // 4. Validate session metadata structure
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate("member ID exists", session.member.id.length > 0);
  TestValidator.predicate(
    "member display name exists",
    session.member.display_name.length > 0,
  );
  TestValidator.predicate("IP address exists", session.ip.length > 0);
  TestValidator.predicate("href is valid URI", session.href.length > 0);
  TestValidator.predicate("referrer is valid URI", session.referrer.length > 0);
  // 5. Verify member information matches authenticated user
  TestValidator.equals("member ID matches", session.member.id, authResponse.id);
  TestValidator.equals(
    "display name matches",
    session.member.display_name,
    authResponse.display_name,
  );
  // 6. Validate timestamp ordering (created_at <= updated_at <= expired_at)
  const createdAt: Date = new Date(session.created_at);
  const updatedAt: Date = new Date(session.updated_at);
  const expiredAt: Date = new Date(session.expired_at);
  const now: Date = new Date();
  TestValidator.predicate("created_at <= updated_at", createdAt <= updatedAt);
  TestValidator.predicate("updated_at <= expired_at", updatedAt <= expiredAt);
  // 7. Validate session expiration is in the future
  TestValidator.predicate("session not expired", expiredAt > now);
}
