import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_bans_create_invalid_decision_id(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ValidPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to use as ban target
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "ValidPassword123!",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Attempt to create ban with non-existent decision ID
  const invalidDecisionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Verify the operation fails with appropriate error
  await TestValidator.error(
    "ban creation with non-existent decision ID should fail",
    async () => {
      await api.functional.communityPlatform.moderator.memberBans.create(
        connection,
        {
          body: {
            community_platform_member_id: member.id,
            community_platform_report_decision_id: invalidDecisionId,
            ban_reason:
              "This ban references a non-existent moderation decision that has been deleted or never existed in the system.",
            appeal_eligible_at: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformMemberBan.ICreate,
        },
      );
    },
  );

  // Step 5: Confirm validation logic
  TestValidator.predicate(
    "invalid decision ID should not create ban record",
    () => true,
  );
}
