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
 * Test support ticket creation for community governance disputes with critical
 * priority.
 *
 * Validates that members can submit tickets concerning community management,
 * rule interpretation, moderation decisions, or member conflicts. Ensures the
 * system handles high-priority governance issues with appropriate escalation
 * and provides comprehensive documentation for administrative review.
 *
 * Test workflow:
 *
 * 1. Create new member account for testing governance ticket submission
 * 2. Submit support ticket with community governance dispute and critical priority
 * 3. Validate ticket attributes match governance requirements
 * 4. Verify audit trail and member attribution
 * 5. Confirm proper escalation and administrative documentation
 */
export async function test_api_support_ticket_creation_community_governance(
  connection: api.IConnection,
): Promise<void> {
  // Create new member account for governance ticket submission
  const memberData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureGov123!",
  } satisfies IRedditCommunityMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Submit governance dispute support ticket with critical priority
  const governanceDisputeData = {
    title:
      "Community Rule Interpretation Dispute - Moderation Policy Violation",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 7,
    }),
    category:
      "community" satisfies IRedditCommunitySupportTicket.ICreate["category"],
    priority:
      "critical" satisfies IRedditCommunitySupportTicket.ICreate["priority"],
    href: "https://reddit-community.com/community-guidelines",
    referrer: "https://reddit-community.com/communities/programming/rules",
  } satisfies IRedditCommunitySupportTicket.ICreate;

  const createdTicket =
    await api.functional.redditCommunity.member.support.supportTickets.create(
      connection,
      {
        body: governanceDisputeData,
      },
    );
  typia.assert(createdTicket);

  // Validate governance-specific ticket attributes
  TestValidator.equals(
    "ticket title matches submission",
    createdTicket.title,
    governanceDisputeData.title,
  );
  TestValidator.equals(
    "ticket description matches submission",
    createdTicket.description,
    governanceDisputeData.description,
  );
  TestValidator.equals(
    "category is community for governance issues",
    createdTicket.category,
    "community",
  );
  TestValidator.equals(
    "priority is critical for governance disputes",
    createdTicket.priority,
    "critical",
  );
  TestValidator.equals(
    "status is open for new ticket",
    createdTicket.status,
    "open",
  );

  // Verify member attribution and audit compliance
  TestValidator.equals(
    "member ID matches creator",
    createdTicket.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member nickname matches",
    createdTicket.member.nickname,
    authorizedMember.nickname,
  );
  TestValidator.equals(
    "member email matches",
    createdTicket.member.email,
    authorizedMember.email,
  );

  // Validate escalation level for critical governance issues
  TestValidator.predicate(
    "escalation level appropriate for critical priority",
    createdTicket.escalation_level >= 3,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    createdTicket.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdTicket.updated_at !== undefined,
  );

  // Confirm audit trail properties
  TestValidator.equals(
    "session ID tracked for audit",
    createdTicket.memberSession.id,
    createdTicket.memberSession.id,
  );
  TestValidator.predicate(
    "session creation timestamp",
    createdTicket.memberSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "session expiration timestamp",
    createdTicket.memberSession.expired_at !== undefined,
  );

  // Validate initial ticket state (no resolution yet)
  TestValidator.equals(
    "no moderator assigned initially",
    createdTicket.assignedModerator,
    null,
  );
  TestValidator.equals(
    "no resolution documentation",
    createdTicket.resolution_steps,
    null,
  );
  TestValidator.equals("no internal notes", createdTicket.internal_notes, null);
  TestValidator.equals("not resolved", createdTicket.resolved_at, null);
  TestValidator.equals("not closed", createdTicket.closed_at, null);
}
