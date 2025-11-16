import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test creating a member authentication session with referral tracking.
 *
 * This test verifies that when a member authenticates through a referral link,
 * the system properly captures and stores the referral information along with
 * session metadata for analytics tracking and member acquisition
 * understanding.
 *
 * The test creates a new member account, then creates an authentication session
 * that includes referral URL tracking to validate the complete referral
 * attribution workflow.
 *
 * 1. Create a new member account for testing
 * 2. Create authentication session with referral information
 * 3. Verify session contains proper referral tracking data
 * 4. Validate session metadata includes acquisition source
 */
export async function test_api_member_session_creation_with_referral_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for referral tracking test
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create authentication session with referral tracking information
  const sessionData = {
    href: "https://economicdiscussion.example.com/articles/referral-campaign",
    ip: "192.168.1.100",
    referrer: "https://referral-partner.example.com/economic-discussion",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const session =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: member.member.id,
        body: sessionData,
      },
    );
  typia.assert(session);

  // Step 3: Verify session contains proper member information
  TestValidator.equals(
    "session member ID matches",
    session.member.id,
    member.member.id,
  );
  TestValidator.equals(
    "session member email matches",
    session.member.email,
    member.member.email,
  );
  TestValidator.equals(
    "session member username matches",
    session.member.username,
    member.member.username,
  );

  // Step 4: Validate referral tracking is properly captured
  TestValidator.equals(
    "session referral URL matches",
    session.referrer,
    sessionData.referrer,
  );
  TestValidator.equals(
    "session IP address matches",
    sessionData.ip,
    session.ip,
  );
  TestValidator.equals(
    "session href URL matches",
    sessionData.href,
    session.href,
  );

  // Step 5: Verify session metadata for analytics tracking
  TestValidator.predicate(
    "session has creation timestamp",
    typeof session.created_at === "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO date format",
    !isNaN(Date.parse(session.created_at)),
  );
}
