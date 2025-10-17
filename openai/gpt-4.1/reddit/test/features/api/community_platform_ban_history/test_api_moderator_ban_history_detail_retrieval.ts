import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validate moderator-access retrieval of detailed ban history entry.
 *
 * 1. Register admin and moderator with distinct email/passwords.
 * 2. Admin creates a report category.
 * 3. Moderator creates a community.
 * 4. Register a member, subscribe to the community.
 * 5. Member creates a report referencing (e.g., no post needed, null post/comment
 *    ids) the new category.
 * 6. Admin issues a ban for the member (ban_type = random choice of 'temporary' or
 *    'permanent', random start/end, reason, report linkage).
 * 7. Moderator retrieves the ban via moderator-level API; validate all data
 *    fields.
 * 8. Test unauthorized access (unrelated account, or missing login) results in
 *    error.
 * 9. Test non-existent banHistoryId returns error.
 */
export async function test_api_moderator_ban_history_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Moderator registration requires a community, so register a member first for mod
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  // Create a community as admin to associate with moderator
  const communityCreate: ICommunityPlatformCommunity.ICreate = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  };
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // Register member (to be banned: must exist for ban, will receive subscription and report)
  // We'll assume registering as a member is implicit via joining moderator subscription workflow.
  // Simulate by creating a subscription - API treats authenticated user
  const memberSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(memberSubscription);

  // 3. Admin creates report category
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 4. Member creates a report referencing the new category
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Register moderator (simulate member previously created)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  const issuedById = admin.id; // Bidirectional check: ban issued by admin (could be mod too)

  // 6. Admin bans member: ban_type random, ban dates, active
  const banType: string = RandomGenerator.pick([
    "temporary",
    "permanent",
  ] as const);
  const banStartAt = new Date().toISOString();
  const banEndAt =
    banType === "temporary"
      ? new Date(Date.now() + 1000 * 60 * 60 * 24) // 1 day later
          .toISOString()
      : null;
  const reason = RandomGenerator.paragraph({ sentences: 5 });

  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  const banHistory =
    await api.functional.communityPlatform.admin.banHistories.create(
      connection,
      {
        body: {
          banned_member_id: memberSubscription.member_id,
          issued_by_id: issuedById,
          community_id: community.id,
          triggering_report_id: report.id,
          reason: reason,
          ban_type: banType,
          ban_start_at: banStartAt,
          ban_end_at: banEndAt,
          is_active: true,
        } satisfies ICommunityPlatformBanHistory.ICreate,
      },
    );
  typia.assert(banHistory);

  // 7. Moderator retrieves the ban via moderator-level API
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });

  const banDetail =
    await api.functional.communityPlatform.moderator.banHistories.at(
      connection,
      {
        banHistoryId: typia.assert<string & tags.Format<"uuid">>(
          banHistory.id!,
        ),
      },
    );
  typia.assert(banDetail);
  TestValidator.equals(
    "retrieved ban id matches created ban",
    banDetail.id,
    banHistory.id,
  );
  TestValidator.equals(
    "ban issued_by_id is correct",
    banDetail.issued_by_id,
    issuedById,
  );
  TestValidator.equals(
    "ban banned_member_id is correct",
    banDetail.banned_member_id,
    memberSubscription.member_id,
  );
  TestValidator.equals(
    "ban community_id is correct",
    banDetail.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban triggering_report_id is correct",
    banDetail.triggering_report_id,
    report.id,
  );
  TestValidator.equals("ban reason is correct", banDetail.reason, reason);
  TestValidator.equals("ban_type is correct", banDetail.ban_type, banType);
  TestValidator.equals("ban is_active is true", banDetail.is_active, true);
  TestValidator.equals(
    "ban_start_at matches",
    banDetail.ban_start_at,
    banStartAt,
  );
  TestValidator.equals("ban_end_at matches", banDetail.ban_end_at, banEndAt);

  // 8. Unauthorized access (simulate new random moderator, wrong community, or missing login)
  const rogueModEmail = typia.random<string & tags.Format<"email">>();
  const rogueModPassword = RandomGenerator.alphaNumeric(10);
  const rogueModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: rogueModEmail,
      password: rogueModPassword,
      community_id: typia.random<string & tags.Format<"uuid">>(), // unrelated community id
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(rogueModerator);
  await TestValidator.error(
    "unauthorized mod forbidden from ban detail retrieval",
    async () => {
      await api.functional.communityPlatform.moderator.banHistories.at(
        connection,
        {
          banHistoryId: typia.assert<string & tags.Format<"uuid">>(
            banHistory.id!,
          ),
        },
      );
    },
  );

  // 9. Non-existent banHistoryId
  await TestValidator.error(
    "non-existent banHistoryId should result in error",
    async () => {
      await api.functional.communityPlatform.moderator.banHistories.at(
        connection,
        {
          banHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
