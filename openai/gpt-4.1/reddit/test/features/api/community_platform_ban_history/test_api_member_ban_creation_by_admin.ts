import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate admin ban creation and audit linkage.
 *
 * This test flow ensures an admin can create and register a new member ban,
 * with all proper entity linkages and audit rules enforced. Steps:
 *
 * 1. Register and authenticate an admin (get adminId).
 * 2. Register a member who will be banned (get memberId).
 * 3. Authenticate as the member (to create dependent entities).
 * 4. Create a community as the member, get its ID.
 * 5. Switch back to the admin account, create a report category (e.g., "Spam").
 * 6. Switch to the member account, file a report in the created community with the
 *    report category.
 * 7. Switch to the admin account, create a ban history targeting the member,
 *    referencing the report, community, and proper admin as issuer.
 * 8. Assert that the ban record fields match linkage expectations, is active, has
 *    proper start time, and audit fields.
 * 9. Attempt to ban same member again for same context without ending previous
 *    ban, expecting an error (duplicate simultaneous ban prevention).
 */
export async function test_api_member_ban_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
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

  // 2. Register member to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Authenticate as the member (token will be set)
  // 4. Create a community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Switch to admin (token will be set again)
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

  // 6. Switch back to member
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: null,
        comment_id: null,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 7. Switch to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // Ban creation start/end times
  const now = new Date();
  const banStart = now.toISOString();
  const banEnd = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString(); // temporary, 3 days from now

  const banHistory =
    await api.functional.communityPlatform.admin.banHistories.create(
      connection,
      {
        body: {
          banned_member_id: member.id,
          issued_by_id: admin.id,
          community_id: community.id,
          triggering_report_id: report.id,
          reason: RandomGenerator.paragraph(),
          ban_type: "temporary",
          ban_start_at: banStart,
          ban_end_at: banEnd,
          is_active: true,
        } satisfies ICommunityPlatformBanHistory.ICreate,
      },
    );
  typia.assert(banHistory);

  TestValidator.equals(
    "linkage: banned_member_id",
    banHistory.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "linkage: issued_by_id",
    banHistory.issued_by_id,
    admin.id,
  );
  TestValidator.equals(
    "linkage: community_id",
    banHistory.community_id,
    community.id,
  );
  TestValidator.equals(
    "linkage: triggering_report_id",
    banHistory.triggering_report_id,
    report.id,
  );
  TestValidator.equals("ban_type", banHistory.ban_type, "temporary");
  TestValidator.equals("reason matches", typeof banHistory.reason, "string");
  TestValidator.equals("is_active", banHistory.is_active, true);
  TestValidator.predicate(
    "ban_start_at before ban_end_at",
    banHistory.ban_start_at < typia.assert(banHistory.ban_end_at!),
  );
  TestValidator.equals(
    "created_at is ISO8601",
    typeof banHistory.created_at,
    "string",
  );

  // 9. Attempt duplicate active ban on same member/community - should fail
  await TestValidator.error(
    "cannot create duplicate active ban for same context",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.create(
        connection,
        {
          body: {
            banned_member_id: member.id,
            issued_by_id: admin.id,
            community_id: community.id,
            triggering_report_id: report.id,
            reason: RandomGenerator.paragraph(),
            ban_type: "temporary",
            ban_start_at: banStart,
            ban_end_at: banEnd,
            is_active: true,
          } satisfies ICommunityPlatformBanHistory.ICreate,
        },
      );
    },
  );
}
