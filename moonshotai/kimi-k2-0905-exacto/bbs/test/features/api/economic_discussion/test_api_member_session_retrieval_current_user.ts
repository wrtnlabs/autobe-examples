import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test retrieving a member's own session details to verify current
 * authentication status and session metadata. This validates that members can
 * access their session information including IP address, creation timestamp,
 * and expiration details for security monitoring.
 */
export async function test_api_member_session_retrieval_current_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: `${RandomGenerator.alphabets(8)}_${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<999>>()}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member registration successful",
    member.member.id !== undefined,
  );

  // Step 2: Create authentication session for the member
  const sessionData = {
    href: "https://example.com/login",
    ip: "192.168.1.1",
    referrer: "https://example.com/registration",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const createdSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: member.member.id,
        body: sessionData,
      },
    );
  typia.assert(createdSession);

  TestValidator.predicate(
    "session created successfully",
    createdSession.id !== undefined,
  );

  // Step 3: Retrieve the session details
  const retrievedSession =
    await api.functional.economicDiscussion.member.members.sessions.at(
      connection,
      {
        memberId: member.member.id,
        sessionId: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // Step 4: Validate session contains correct member information
  TestValidator.equals(
    "session member ID matches",
    retrievedSession.member.id,
    member.member.id,
  );
  TestValidator.equals(
    "session member username matches",
    retrievedSession.member.username,
    member.member.username,
  );
  TestValidator.equals(
    "session member email matches",
    retrievedSession.member.email,
    member.member.email,
  );

  // Step 5: Validate session security metadata
  TestValidator.equals(
    "session IP matches",
    retrievedSession.ip,
    sessionData.ip,
  );
  TestValidator.equals(
    "session href matches",
    retrievedSession.href,
    sessionData.href,
  );
  TestValidator.equals(
    "session referrer matches",
    retrievedSession.referrer,
    sessionData.referrer,
  );

  // Step 6: Validate session timestamps and identifiers
  TestValidator.predicate(
    "session has creation timestamp",
    retrievedSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "session created_at is valid datetime",
    new Date(retrievedSession.created_at).toString() !== "Invalid Date" &&
      !isNaN(Date.parse(retrievedSession.created_at)),
  );
  TestValidator.predicate(
    "session has valid UUID",
    retrievedSession.id !== undefined,
  );

  // Step 7: Verify optional fields handling
  if (retrievedSession.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at is valid datetime when present",
      new Date(retrievedSession.expired_at).toString() !== "Invalid Date" &&
        !isNaN(Date.parse(retrievedSession.expired_at)),
    );
  }

  TestValidator.predicate(
    "session retrieval successful",
    retrievedSession !== undefined,
  );
}
