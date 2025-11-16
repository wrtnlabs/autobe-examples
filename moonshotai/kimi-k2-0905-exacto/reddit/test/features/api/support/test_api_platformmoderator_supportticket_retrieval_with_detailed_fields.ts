import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSessions";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

/**
 * Test comprehensive support ticket retrieval including all detailed fields and
 * associated relationships.
 *
 * This test validates the platform moderator's ability to retrieve complete
 * support ticket information including all detailed fields and associated
 * relationships. The comprehensive validation includes:
 *
 * 1. Ticket creation by a member with full details (title, description, priority,
 *    category)
 * 2. Platform moderator authentication setup
 * 3. Creation of additional test tickets for comprehensive verification
 * 4. Detailed ticket retrieval with all nested objects verification
 * 5. Validation of member summary information in ticket response
 * 6. Verification of session context and audit trail fields
 * 7. Testing of various ticket states and configurations
 */
export async function test_api_platformmoderator_supportticket_retrieval_with_detailed_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a member account and authenticate
  const memberJoinData = {
    nickname: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "SecurePass123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinData,
  });
  typia.assert(member);

  // Step 2: Login as member to create tickets
  const memberLoginData = {
    email: memberJoinData.email,
    password: memberJoinData.password,
    referrer: "https://reddit-community.com/",
    href: "https://reddit-community.com/support/create",
    ip: "192.168.1.100",
  } satisfies IRedditCommunityMember.ILoginRequest;

  await api.functional.auth.member.login(connection, {
    body: memberLoginData,
  });

  // Step 3: Create comprehensive support tickets
  const ticket1Data = {
    title: "Account verification issue preventing login",
    description:
      "I am unable to verify my email address after registration. The verification link sent to my email is not working, displaying an error message that the link has expired or is invalid. I need assistance to complete the verification process and activate my account.",
    category: "account",
    priority: "high",
    referrer: "https://reddit-community.com/dashboard",
    href: "https://reddit-community.com/support/create",
  } satisfies IRedditCommunitySupportTicket.ICreate;

  const ticket1 =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      {
        body: ticket1Data,
      },
    );
  typia.assert(ticket1);

  const ticket2Data = {
    title: "Community moderation feature not loading properly",
    description:
      "The community moderation dashboard is experiencing loading issues that prevent me from accessing essential moderation tools. The page shows loading indicators indefinitely and doesn't display any community management options. This appears to be a technical issue affecting the moderator interface functionality.",
    category: "technical",
    priority: "medium",
    referrer: "https://reddit-community.com/moderator/dashboard",
    href: "https://reddit-community.com/support/create",
  } satisfies IRedditCommunitySupportTicket.ICreate;

  const ticket2 =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      {
        body: ticket2Data,
      },
    );
  typia.assert(ticket2);

  const ticket3Data = {
    title: "Inappropriate content reported in community discussion",
    description:
      "I observed content in the main community discussion that appears to violate the platform's content guidelines. The post contains potentially offensive language and inappropriate imagery that should be reviewed by the moderation team. I hope the platform takes appropriate measures to maintain a healthy community environment.",
    category: "content",
    priority: "critical",
    referrer: "https://reddit-community.com/communities/main/discussions",
    href: "https://reddit-community.com/support/create",
  } satisfies IRedditCommunitySupportTicket.ICreate;

  const ticket3 =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      {
        body: ticket3Data,
      },
    );
  typia.assert(ticket3);

  // Step 4: Switch to platform moderator account
  const moderatorJoinData = {
    nickname: `${RandomGenerator.alphabets(8)}_mod`,
    email: `${RandomGenerator.alphabets(8)}@moderator.com`,
    password: "ModeratorSecurePass123!",
    referrer: "https://admin.reddit-community.com/",
    href: "https://admin.reddit-community.com/register",
    ip: "10.0.0.1",
  } satisfies IRedditCommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.platformModerator.join(
    connection,
    {
      body: moderatorJoinData,
    },
  );
  typia.assert(moderator);

  const moderatorLoginData = {
    email: moderatorJoinData.email,
    password: moderatorJoinData.password,
    referrer: "https://admin.reddit-community.com/",
    href: "https://admin.reddit-community.com/login",
    ip: "10.0.0.2",
  } satisfies IRedditCommunityPlatformModerator.ILogin;

  await api.functional.auth.platformModerator.login(connection, {
    body: moderatorLoginData,
  });

  // Step 5: Retrieve and validate detailed ticket information
  const retrievedTicket1 =
    await api.functional.redditCommunity.platformModerator.support.supportTickets.at(
      connection,
      {
        supportTicketId: ticket1.id,
      },
    );
  typia.assert(retrievedTicket1);

  // Step 6: Comprehensive validation of retrieved ticket fields
  TestValidator.equals("ticket ID matches", retrievedTicket1.id, ticket1.id);
  TestValidator.equals(
    "ticket title matches",
    retrievedTicket1.title,
    ticket1Data.title,
  );
  TestValidator.equals(
    "ticket description matches",
    retrievedTicket1.description,
    ticket1Data.description,
  );
  TestValidator.equals(
    "ticket category matches",
    retrievedTicket1.category,
    ticket1Data.category,
  );
  TestValidator.equals(
    "ticket priority matches",
    retrievedTicket1.priority,
    ticket1Data.priority,
  );
  TestValidator.equals(
    "ticket status is open",
    retrievedTicket1.status,
    "open",
  );
  TestValidator.equals(
    "escalation level is default 1",
    retrievedTicket1.escalation_level,
    1,
  );

  // Validate member information
  TestValidator.equals(
    "member ID matches",
    retrievedTicket1.member.id,
    member.id,
  );
  TestValidator.equals(
    "member nickname matches",
    retrievedTicket1.member.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "member email matches",
    retrievedTicket1.member.email,
    member.email,
  );
  TestValidator.equals(
    "member created_at exists",
    typia.is<string>(retrievedTicket1.member.created_at),
    true,
  );

  // Validate timestamps
  TestValidator.equals(
    "created_at is valid string",
    typia.is<string>(retrievedTicket1.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is valid string",
    typia.is<string>(retrievedTicket1.updated_at),
    true,
  );
  TestValidator.equals(
    "closed_at is null for open ticket",
    retrievedTicket1.closed_at,
    undefined,
  );
  TestValidator.equals(
    "resolved_at is null for open ticket",
    retrievedTicket1.resolved_at,
    undefined,
  );

  // Step 7: Validate session information contains required fields
  TestValidator.equals(
    "session ID is valid UUID",
    typia.is<string>(retrievedTicket1.memberSession.id) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedTicket1.memberSession.id,
      ),
    true,
  );
  TestValidator.equals(
    "session created_at exists",
    typia.is<string>(retrievedTicket1.memberSession.created_at),
    true,
  );
  TestValidator.equals(
    "session expired_at exists",
    typia.is<string>(retrievedTicket1.memberSession.expired_at),
    true,
  );

  // Step 8: Validate optional fields
  TestValidator.equals(
    "no assigned moderator initially",
    retrievedTicket1.assignedModerator,
    undefined,
  );
  TestValidator.equals(
    "no internal notes initially",
    retrievedTicket1.internal_notes,
    undefined,
  );
  TestValidator.equals(
    "no resolution steps initially",
    retrievedTicket1.resolution_steps,
    undefined,
  );

  // Step 9: Retrieve and validate second ticket with different configuration
  const retrievedTicket2 =
    await api.functional.redditCommunity.platformModerator.support.supportTickets.at(
      connection,
      {
        supportTicketId: ticket2.id,
      },
    );
  typia.assert(retrievedTicket2);

  TestValidator.equals(
    "ticket2 category is technical",
    retrievedTicket2.category,
    "technical",
  );
  TestValidator.equals(
    "ticket2 priority is medium",
    retrievedTicket2.priority,
    "medium",
  );
  TestValidator.predicate(
    "ticket2 description contains technical terms",
    retrievedTicket2.description.includes("technical") ||
      retrievedTicket2.description.includes("loading") ||
      retrievedTicket2.description.includes("functionality"),
  );

  // Step 10: Retrieve and validate third ticket with critical priority
  const retrievedTicket3 =
    await api.functional.redditCommunity.platformModerator.support.supportTickets.at(
      connection,
      {
        supportTicketId: ticket3.id,
      },
    );
  typia.assert(retrievedTicket3);

  TestValidator.equals(
    "ticket3 category is content",
    retrievedTicket3.category,
    "content",
  );
  TestValidator.equals(
    "ticket3 priority is critical",
    retrievedTicket3.priority,
    "critical",
  );
  TestValidator.equals(
    "ticket3 escalation level remains 1",
    retrievedTicket3.escalation_level,
    1,
  );
}
