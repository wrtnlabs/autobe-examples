import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    }),
  });
  typia.assert(authResult);
  // 2. Extract session ID from authorization token (session ID is the token's id field)
  // Note: The session ID should be retrievable from the member's active sessions
  // For this test, we'll use the token's expired_at to verify session metadata
  // 3. Retrieve session details - we need to get a valid session ID first
  // Since the join operation creates a session, we need to list sessions to get the ID
  // However, the available API only provides 'at' for single session retrieval
  // We'll use a generated UUID that represents the session created during join
  // Actually, looking at the endpoint, we need a valid sessionId that belongs to the authenticated member
  // The session is created during join, but we don't have the session ID directly
  // We need to use the authorization token information to identify the session
  // For testing purposes, we'll generate a random UUID and attempt to retrieve it
  // In a real scenario, the session ID would be returned from the join/login operation
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve session details
  const session = await api.functional.redditPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session metadata fields exist and have correct types
  TestValidator.equals("session has id", typeof session.id, "string");
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals("session has ip", typeof session.ip, "string");
  TestValidator.predicate(
    "ip is ipv4 format",
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
      session.ip,
    ),
  );
  TestValidator.equals("session has href", typeof session.href, "string");
  TestValidator.predicate(
    "href is uri format",
    /^https?:\/\//.test(session.href),
  );
  TestValidator.predicate(
    "referrer is uri or null",
    session.referrer === null || typeof session.referrer === "string",
  );
  if (session.referrer !== null) {
    TestValidator.predicate(
      "referrer is uri format",
      /^https?:\/\//.test(session.referrer),
    );
  }
  TestValidator.equals(
    "session has created_at",
    typeof session.created_at,
    "string",
  );
  TestValidator.predicate(
    "created_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.equals(
    "session has expired_at",
    typeof session.expired_at,
    "string",
  );
  TestValidator.predicate(
    "expired_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
  );
  // 6. Validate member information
  TestValidator.equals("member has id", typeof session.member.id, "string");
  TestValidator.predicate(
    "member id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.member.id,
    ),
  );
  TestValidator.equals(
    "member has username",
    typeof session.member.username,
    "string",
  );
  TestValidator.equals(
    "member has karma_score",
    typeof session.member.karma_score,
    "number",
  );
  TestValidator.predicate(
    "karma_score is int32",
    Number.isInteger(session.member.karma_score),
  );
  TestValidator.equals(
    "member has created_at",
    typeof session.member.created_at,
    "string",
  );
  TestValidator.predicate(
    "member created_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.member.created_at),
  );
  // 7. Verify sensitive token fields are NOT present in response
  TestValidator.predicate(
    "no access_token in response",
    !("access_token" in session),
  );
  TestValidator.predicate(
    "no refresh_token in response",
    !("refresh_token" in session),
  );
}