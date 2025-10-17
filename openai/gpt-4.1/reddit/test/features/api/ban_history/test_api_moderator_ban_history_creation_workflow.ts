import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Test the complete workflow for a moderator issuing a ban to a user.
 *
 * Steps:
 *
 * 1. Register an admin to create a report category.
 * 2. Register a member and create a new community.
 * 3. Subscribe the member to the new community.
 * 4. Register a moderator assigned to the community.
 * 5. Member files a report against themselves to simulate violation.
 * 6. Moderator issues a permanent ban for the member associated with the report
 *    and community.
 * 7. Confirm ban record detail matches expectations and audit chain.
 * 8. Confirm banned member cannot participate (re-subscribe attempt rejected).
 * 9. Edge/negative: Attempt to ban again (should fail), and test permission
 *    boundary.
 */
export async function test_api_moderator_ban_history_creation_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  const adminToken: IAuthorizationToken = admin.token;

  // 2. Admin creates a report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: `abuse-${RandomGenerator.alphaNumeric(6)}`,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 3. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberId = member.id;

  // 4. Member creates a new community
  const communityName = RandomGenerator.alphaNumeric(5).toLowerCase();
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          slug: `${communityName}-slug`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;

  // 5. Member subscribes to the community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 6. Register moderator assigned to the community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  const moderatorId = moderator.id;

  // 7. Member (reporter) files a report for themselves
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 6 }),
        // To simulate, use only post_id or comment_id, but both can be null
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 8. Moderator issues a permanent ban for the member
  // Switch to moderator role: login and become authorized
  // (For this scenario, we assume join auto-grants token)
  const now = new Date();
  const banInput = {
    banned_member_id: memberId,
    issued_by_id: moderatorId,
    community_id: communityId,
    triggering_report_id: report.id,
    reason: `Policy violation: ${RandomGenerator.paragraph()}`,
    ban_type: "permanent",
    ban_start_at: now.toISOString(),
    ban_end_at: null,
    is_active: true,
  } satisfies ICommunityPlatformBanHistory.ICreate;
  const ban =
    await api.functional.communityPlatform.moderator.banHistories.create(
      connection,
      {
        body: banInput,
      },
    );
  typia.assert(ban);

  TestValidator.equals("ban'd member", ban.banned_member_id, memberId);
  TestValidator.equals("issued_by (moderator)", ban.issued_by_id, moderatorId);
  TestValidator.equals("community linked", ban.community_id, communityId);
  TestValidator.equals("report linkage", ban.triggering_report_id, report.id);
  TestValidator.equals("ban_type", ban.ban_type, "permanent");
  TestValidator.equals("is_active is true", ban.is_active, true);

  // 9. Banned user cannot participate further
  await TestValidator.error("banned user cannot subscribe again", async () => {
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  });

  // 10. Attempt to ban member again (should fail)
  await TestValidator.error(
    "cannot ban permanently banned user again",
    async () => {
      await api.functional.communityPlatform.moderator.banHistories.create(
        connection,
        {
          body: banInput,
        },
      );
    },
  );

  // 11. Negative permission test: non-moderator cannot issue ban
  await TestValidator.error("member cannot issue a ban", async () => {
    await api.functional.communityPlatform.moderator.banHistories.create(
      connection,
      {
        body: {
          ...banInput,
          issued_by_id: memberId,
        },
      },
    );
  });
}
