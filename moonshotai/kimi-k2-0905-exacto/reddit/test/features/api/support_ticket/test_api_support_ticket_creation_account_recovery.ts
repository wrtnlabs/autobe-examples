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
 * Test the support ticket workflow for account recovery requests.
 *
 * This test validates that community members can create support tickets for
 * account-related issues including login problems, password recovery, and
 * account security concerns. The test creates an account recovery support
 * ticket with detailed description and verifies the system properly captures
 * account context and routes to appropriate support channels.
 *
 * 1. Register a new member account
 * 2. Create a support ticket for account recovery in account category with low
 *    priority
 * 3. Provide detailed account issues including login problems
 * 4. Validate ticket creation response confirms proper routing and context capture
 */
export async function test_api_support_ticket_creation_account_recovery(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication context
  const memberRegistration = {
    nickname: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) + "123!", // Generate secure password
  } satisfies IRedditCommunityMember.ICreate;

  const createdMember = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(createdMember);
  TestValidator.predicate(
    "member registration successful",
    createdMember.id.length > 0,
  );

  // Step 2: Create a support ticket for account recovery with detailed issues
  const supportDescription = `I am experiencing multiple account-related issues that prevent me from accessing my account. 
  The main problems are: 
  1. I cannot remember my current password and the "forgot password" link is not sending the reset email 
  2. My account seems to be locked due to too many failed login attempts 
  3. I suspect unauthorized access as I saw some suspicious activity notifications 
  4. My two-factor authentication method appears to be compromised 
  
  I need assistance with: 
  - A secure password reset link sent to my backup email 
  - Account recovery process 
  - Reviewing recent login activity 
  - Restoring account security settings
  
  My member ID is ${createdMember.id} and I can provide additional verification if needed.`;

  const accountRecoveryTicket = {
    title: "Account Recovery Request - Login Issues",
    description: supportDescription,
    category: "account" as const,
    priority: "low" as const,
    // Session context fields for audit compliance
    ip: "192.168.1.100",
    href: "https://redditcommunity.com/support/account-recovery",
    referrer: "https://redditcommunity.com/login/forgot-password",
  } satisfies IRedditCommunitySupportTicket.ICreate;

  const createdTicket =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      { body: accountRecoveryTicket },
    );
  typia.assert(createdTicket);

  // Step 3: Validate ticket creation response
  TestValidator.equals(
    "ticket category correctly set to account",
    createdTicket.category,
    "account",
  );
  TestValidator.equals(
    "ticket priority correctly set to low",
    createdTicket.priority,
    "low",
  );
  TestValidator.equals(
    "ticket status initially set to open",
    createdTicket.status,
    "open",
  );
  TestValidator.equals(
    "ticket title matches submission",
    createdTicket.title,
    accountRecoveryTicket.title,
  );
  TestValidator.predicate(
    "ticket description contains account recovery details",
    createdTicket.description.includes("password reset") &&
      createdTicket.description.includes("login attempts") &&
      createdTicket.description.includes("account recovery") &&
      createdTicket.description.includes(createdMember.id),
  );

  // Step 4: Validate member association and audit information
  TestValidator.equals(
    "ticket member reference matches",
    createdTicket.member.id,
    createdMember.id,
  );
  TestValidator.equals(
    "ticket member email matches",
    createdTicket.member.email,
    createdMember.email,
  );
  TestValidator.predicate(
    "escalation level within valid range",
    createdTicket.escalation_level >= 1 && createdTicket.escalation_level <= 4,
  );
  TestValidator.predicate(
    "ticket ID is valid UUID",
    createdTicket.id.length > 0 && createdTicket.id.includes("-"),
  );

  // Additional validation for account recovery context
  TestValidator.predicate(
    "ticket has proper audit session information",
    createdTicket.memberSession !== undefined &&
      createdTicket.memberSession.created_at !== undefined &&
      createdTicket.memberSession.id !== undefined,
  );
}
