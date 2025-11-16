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
 * Test attempting to create a suspension with invalid duration (e.g., 0 days,
 * 366 days, -5 days, 1000 days). Verifies the system rejects durations outside
 * the 1-365 day range. This validates suspension duration boundary
 * constraints.
 */
export async function test_api_moderation_decision_moderator_create_suspend_invalid_duration(
  connection: api.IConnection,
) {
  // Register member involved in violation
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Register moderator to make decisions
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Reject suspension with 0 days (below minimum of 1)
  await TestValidator.error(
    "should reject suspension with 0 days duration",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId,
          body: {
            action_type: "suspend_user",
            reason: "User violated community standards with harassment",
            suspension_duration_days: 0,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 2: Reject suspension with 366 days (above maximum of 365)
  await TestValidator.error(
    "should reject suspension with 366 days duration",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId,
          body: {
            action_type: "suspend_user",
            reason: "User violated community standards with harassment",
            suspension_duration_days: 366,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 3: Reject suspension with negative duration
  await TestValidator.error(
    "should reject suspension with negative duration",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId,
          body: {
            action_type: "suspend_user",
            reason: "User violated community standards with harassment",
            suspension_duration_days: -5,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 4: Reject suspension with extremely large duration
  await TestValidator.error(
    "should reject suspension with 1000 days duration",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId,
          body: {
            action_type: "suspend_user",
            reason: "User violated community standards with harassment",
            suspension_duration_days: 1000,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );
}
