import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test complete session creation workflow following member login success.
 *
 * This test validates the complete authentication flow where a member
 * registers, logs in successfully, and then has a session created with
 * comprehensive security tracking data. The session captures essential metadata
 * including IP address for security verification, login URL for context
 * tracking, and referral information for user acquisition analytics.
 *
 * The workflow follows these sequential steps:
 *
 * 1. Register a new member account with valid credentials
 * 2. Authenticate the member through login process
 * 3. Create a session record with connection context and security metadata
 * 4. Validate that the session contains proper member association and tracking
 *    data
 *
 * @param connection - The API connection for making authenticated requests
 */
export async function test_api_member_session_creation_login_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(registeredMember);

  // Step 2: Authenticate the member via login
  const loginData = {
    email: memberData.email,
    password_hash: memberData.password, // Using the same password from registration
  } satisfies IEconomicDiscussionMember.ILogin;

  const authenticatedMember = await api.functional.auth.member.login(
    connection,
    { body: loginData },
  );
  typia.assert(authenticatedMember);

  TestValidator.equals(
    "authenticated member matches registered member",
    authenticatedMember.member.id,
    registeredMember.member.id,
  );

  // Step 3: Create session with connection context
  const sessionData = {
    href: "https://economicdiscussion.example.com/login",
    ip: "192.168.1.100",
    referrer: "https://economicdiscussion.example.com/register",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: authenticatedMember.member.id,
        body: sessionData,
      },
    );
  typia.assert(createdSession);

  // Step 4: Validate session creation and data integrity
  TestValidator.equals(
    "session member matches authenticated member",
    createdSession.member.id,
    authenticatedMember.member.id,
  );
  TestValidator.equals(
    "session member email matches",
    createdSession.member.email,
    authenticatedMember.member.email,
  );
  TestValidator.equals(
    "session member username matches",
    createdSession.member.username,
    authenticatedMember.member.username,
  );

  TestValidator.equals(
    "session IP address recorded correctly",
    createdSession.ip,
    sessionData.ip,
  );
  TestValidator.equals(
    "session href matches login URL",
    createdSession.href,
    sessionData.href,
  );
  TestValidator.equals(
    "session referrer matches registration source",
    createdSession.referrer,
    sessionData.referrer,
  );

  TestValidator.predicate(
    "session has creation timestamp",
    createdSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "session created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdSession.created_at),
  );

  TestValidator.predicate(
    "session has unique identifier",
    createdSession.id !== undefined && createdSession.id.length > 0,
  );
}
