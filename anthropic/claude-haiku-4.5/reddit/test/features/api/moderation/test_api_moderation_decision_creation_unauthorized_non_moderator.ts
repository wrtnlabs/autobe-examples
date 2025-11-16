import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that non-moderator users cannot create moderation decisions and receive
 * authorization error.
 *
 * This test validates the critical authorization boundary that protects
 * moderation endpoints from unauthorized access. Only authenticated moderators
 * should be able to create moderation decisions. Regular members and guests
 * must be rejected with 401 or 403 status codes.
 *
 * The test workflow:
 *
 * 1. Create member user account (non-moderator)
 * 2. Create a report as the member user
 * 3. Attempt to create moderation decision as the member (should fail)
 * 4. Verify the operation is rejected with proper authorization error (401/403)
 * 5. Test that decision creation fails for unauthorized users
 *
 * This ensures role-based access control enforcement at the moderation
 * endpoint.
 */
export async function test_api_moderation_decision_creation_unauthorized_non_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (non-moderator user)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/auth",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);

  // Switch connection to member context
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberAuth.token.access,
    },
  };

  // Step 2: Create a report as the member user
  const reportData = {
    category: "harassment",
    additional_details: RandomGenerator.paragraph({ sentences: 3 }),
    reporter_contact_email: memberEmail,
  } satisfies ICommunityPlatformReport.ICreate;

  const report = await api.functional.communityPlatform.member.reports.create(
    memberConnection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 3: Attempt to create a moderation decision as the member (should fail)
  // The member is not a moderator, so this should be rejected
  const decisionData = {
    action_type: "issue_warning" as const,
    reason:
      "This content violates community rules regarding harassment policy.",
    internal_notes: "Pattern of repeated violations from this member.",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  // Step 4: Verify the operation is rejected with authorization error
  await TestValidator.httpError(
    "non-moderator member should not be able to create moderation decision",
    [401, 403],
    async () => {
      return await api.functional.communityPlatform.moderator.reports.decision.create(
        memberConnection,
        {
          reportId: report.id,
          body: decisionData,
        },
      );
    },
  );

  // Step 5: Test with completely unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated user should not be able to create moderation decision",
    [401, 403],
    async () => {
      return await api.functional.communityPlatform.moderator.reports.decision.create(
        unauthConnection,
        {
          reportId: report.id,
          body: decisionData,
        },
      );
    },
  );
}
