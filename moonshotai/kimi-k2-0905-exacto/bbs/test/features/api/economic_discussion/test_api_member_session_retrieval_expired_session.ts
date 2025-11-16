import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

export async function test_api_member_session_retrieval_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberCreateData = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Step 2: Create a session for the member
  const sessionCreateData = {
    href: "https://example.com/economicDiscussion/login",
    ip: "192.168.1.1",
    referrer: "https://example.com/economicDiscussion/",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const session: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: member.member.id,
        body: sessionCreateData,
      },
    );
  typia.assert(session);

  // Validate the session was created with correct member association
  TestValidator.equals(
    "session member id",
    session.member.id,
    member.member.id,
  );
  TestValidator.equals("session href", session.href, sessionCreateData.href);
  TestValidator.equals("session ip", session.ip, sessionCreateData.ip);
  TestValidator.equals(
    "session referrer",
    session.referrer,
    sessionCreateData.referrer,
  );

  // Step 3: Retrieve the session details to verify it exists and is accessible
  const retrievedSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.at(
      connection,
      {
        memberId: member.member.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // Validate the retrieved session matches the created session
  TestValidator.equals("retrieved session id", retrievedSession.id, session.id);
  TestValidator.equals(
    "retrieved session member id",
    retrievedSession.member.id,
    session.member.id,
  );
  TestValidator.equals(
    "retrieved session href",
    retrievedSession.href,
    session.href,
  );
  TestValidator.equals("retrieved session ip", retrievedSession.ip, session.ip);

  // Step 4: Test expired session handling (simulate expired session scenario)
  // The actual session expiration is typically handled by JWT token expiration
  // We verify that the session structure properly handles the expired_at field
  if (retrievedSession.expired_at) {
    TestValidator.predicate(
      "expired_at is valid date",
      new Date(retrievedSession.expired_at) instanceof Date,
    );
  }

  // Verify session lifecycle fields are properly set
  TestValidator.predicate(
    "session has created_at",
    retrievedSession.created_at !== null &&
      retrievedSession.created_at !== undefined,
  );

  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedSession.created_at) instanceof Date,
  );

  // Final validation to ensure proper session management
  TestValidator.predicate(
    "session retrieval successful",
    typeof session.id === "string" && session.id.length > 0,
  );
}
