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
 * Test attempting to create a moderation decision with an invalid reason
 * length. Verifies reason field has minimum length requirement (10 characters).
 * This validates business rule enforcement for decision explanation adequacy.
 *
 * Workflow:
 *
 * 1. Register a moderator account
 * 2. Register a member account
 * 3. Use a valid report UUID for testing
 * 4. Attempt to create a decision with reason below minimum length - should fail
 */
export async function test_api_moderation_decision_moderator_create_missing_reason(
  connection: api.IConnection,
) {
  // Step 1: Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create decision with insufficient reason length
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Attempt to create decision with reason below minimum length - should fail
  await TestValidator.error(
    "should fail when reason field is too short",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: reportId,
          body: {
            action_type: "issue_warning",
            reason: "Short", // Only 5 characters, below minimum 10
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );
}
