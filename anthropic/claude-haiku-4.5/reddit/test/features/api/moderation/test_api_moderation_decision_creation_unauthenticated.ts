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
 * Test that unauthenticated requests to create a moderation decision are
 * rejected.
 *
 * This test validates that the moderation decision creation endpoint requires
 * valid moderator authentication and does not allow anonymous or missing token
 * access.
 *
 * Workflow:
 *
 * 1. Create a member account and submit a violation report
 * 2. Create a moderator account (authenticated setup)
 * 3. Attempt to create decision with unauthenticated connection (empty headers)
 * 4. Verify the request is rejected with 401 Unauthorized error
 */
export async function test_api_moderation_decision_creation_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: "ValidPassword123!",
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        category: "harassment",
        reported_member_id: typia.random<string & tags.Format<"uuid">>(),
        additional_details: RandomGenerator.paragraph({
          sentences: 3,
        }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 3: Create moderator account (for setup, authenticated)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.name(1),
    password: "ValidPassword123!",
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 4: Create unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Attempt to create decision without authentication
  await TestValidator.error(
    "unauthenticated request should be rejected with 401",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        unauthenticatedConnection,
        {
          reportId: report.id,
          body: {
            action_type: "issue_warning",
            reason:
              "User violated community harassment policy with threatening language.",
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );
}
