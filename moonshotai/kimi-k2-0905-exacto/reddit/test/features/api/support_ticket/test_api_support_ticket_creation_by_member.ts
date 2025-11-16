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
 * Test the complete support ticket creation workflow where a member submits a
 * technical problem with high priority.
 *
 * This test validates the complete support ticket creation process from member
 * authentication through ticket submission. It ensures that members can
 * successfully create support tickets with proper categorization and priority
 * assignment, while maintaining complete audit trail compliance through session
 * metadata tracking.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Create a support ticket with technical category and high priority
 * 3. Validate all ticket fields are properly captured including audit trail data
 * 4. Verify session context is correctly associated with the ticket
 * 5. Confirm ticket creation success and immediate confirmation response
 */
export async function test_api_support_ticket_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for ticket creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData: IRedditCommunityMember.ICreate = {
    nickname: RandomGenerator.name(),
    email: memberEmail,
    password: "SecurePass123!" satisfies string &
      tags.MinLength<8> &
      tags.Format<"password">,
  } satisfies IRedditCommunityMember.ICreate;

  // Register the member and receive authorization token
  const registeredMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(registeredMember);

  // Verify member registration was successful
  TestValidator.equals(
    "member registration success",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.predicate(
    "member has valid UUID ID",
    typeof registeredMember.id === "string" &&
      registeredMember.id.length === 36,
  );
  TestValidator.predicate(
    "member has valid authorization token",
    typeof registeredMember.token.access === "string" &&
      registeredMember.token.access.length > 0,
  );

  // Step 2: Create support ticket with technical problem and high priority
  const currentUrl = "https://reddit-community.com/support";
  const referrerUrl = "https://reddit-community.com/dashboard";
  const clientIp = "192.168.1.100";

  const ticketData = {
    title: "Cannot access dashboard - Loading error" satisfies string &
      tags.MinLength<5> &
      tags.MaxLength<200>,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }) satisfies string & tags.MinLength<10> & tags.MaxLength<5000>,
    category: "technical" as const,
    priority: "high" as const,
    href: currentUrl,
    referrer: referrerUrl,
    ip: clientIp,
  } satisfies IRedditCommunitySupportTicket.ICreate;

  // Submit the support ticket
  const createdTicket: IRedditCommunitySupportTicket =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      { body: ticketData },
    );

  // Step 3: Validate ticket creation response
  typia.assert(createdTicket);

  // Verify ticket core fields match submitted data
  TestValidator.equals(
    "ticket title matches",
    createdTicket.title,
    ticketData.title,
  );
  TestValidator.equals(
    "ticket description matches",
    createdTicket.description,
    ticketData.description,
  );
  TestValidator.equals(
    "ticket category matches",
    createdTicket.category,
    ticketData.category,
  );
  TestValidator.equals(
    "ticket priority matches",
    createdTicket.priority,
    ticketData.priority,
  );

  // Step 4: Validate audit trail and session context
  TestValidator.predicate(
    "ticket has valid UUID",
    typeof createdTicket.id === "string" && createdTicket.id.length === 36,
  );
  TestValidator.predicate(
    "ticket has valid creation timestamp",
    createdTicket.created_at.length > 0 &&
      createdTicket.created_at.includes("T"),
  );
  TestValidator.predicate(
    "ticket has valid update timestamp",
    createdTicket.updated_at.length > 0 &&
      createdTicket.updated_at.includes("T"),
  );

  // Verify member association
  TestValidator.equals(
    "ticket member ID matches",
    createdTicket.member.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "ticket member email matches",
    createdTicket.member.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "ticket member nickname matches",
    createdTicket.member.nickname,
    registeredMember.nickname,
  );

  // Verify session context for audit compliance
  TestValidator.predicate(
    "ticket has session context",
    typeof createdTicket.memberSession.id === "string",
  );
  TestValidator.predicate(
    "ticket session has creation timestamp",
    createdTicket.memberSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "ticket session has expiration timestamp",
    createdTicket.memberSession.expired_at.length > 0,
  );

  // Step 5: Validate ticket lifecycle state
  TestValidator.equals("ticket status is open", createdTicket.status, "open");
  TestValidator.equals(
    "ticket escalation level is 1",
    createdTicket.escalation_level,
    1,
  );
  TestValidator.predicate(
    "ticket has no assigned moderator yet",
    createdTicket.assignedModerator === null,
  );
  TestValidator.predicate(
    "ticket has no closed date yet",
    createdTicket.closed_at === null,
  );
  TestValidator.predicate(
    "ticket has no resolved date yet",
    createdTicket.resolved_at === null,
  );
  TestValidator.predicate(
    "ticket has no internal notes yet",
    createdTicket.internal_notes === undefined,
  );
  TestValidator.predicate(
    "ticket has no resolution steps yet",
    createdTicket.resolution_steps === undefined,
  );

  // Step 6: Confirm successful ticket creation with all audit requirements met
  TestValidator.predicate(
    "ticket creation completed successfully",
    createdTicket.id.length > 0,
  );
  TestValidator.predicate(
    "all audit trail fields are populated",
    createdTicket.memberSession.id.length > 0 &&
      createdTicket.memberSession.created_at.length > 0 &&
      createdTicket.memberSession.expired_at.length > 0,
  );
}
