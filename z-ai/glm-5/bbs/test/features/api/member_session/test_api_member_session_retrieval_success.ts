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
  // Step 1: Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  // Create member account and get authenticated session
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Step 2: Retrieve session using the session ID
  // The session ID is generated for testing the retrieval endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.discussionBoard.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 3: Validate session response structure
  // Validate member summary properties match the authenticated member
  TestValidator.equals("member ID matches", session.member.id, authorized.id);
  TestValidator.equals(
    "displayName matches",
    session.member.displayName,
    authorized.displayName,
  );
  TestValidator.equals(
    "banned status matches",
    session.member.banned,
    authorized.banned,
  );
  // Validate session has not expired
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("session has not expired", expiredAt > now);
  // Validate created_at is in the past
  const createdAt = new Date(session.created_at);
  TestValidator.predicate("session created in the past", createdAt <= now);
  // Validate IP address format (IPv4)
  TestValidator.predicate(
    "IP is valid IPv4",
    /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
      session.ip,
    ),
  );
  // Validate href is valid URI
  TestValidator.predicate(
    "href is valid URI",
    /^https?:\/\/.+/i.test(session.href),
  );
  // Validate referrer is valid URI when present
  if (session.referrer !== null) {
    TestValidator.predicate(
      "referrer is valid URI when present",
      /^https?:\/\/.+/i.test(session.referrer),
    );
  }
}
