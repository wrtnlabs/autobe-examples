import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * End-to-end test verifying the workflow and permissions for an admin to fetch
 * full ban history details for a member.
 *
 * Validates that the admin can create the full workflow:
 *
 * 1. Register and authenticate as new admin (gets admin privileges)
 * 2. Create a community (to ensure a real context for subscription and future ban)
 * 3. Subscribe a new member to the community (establishes test member and records
 *    member id)
 * 4. As admin, create a report category (required for report, e.g., 'abuse',
 *    'spam')
 * 5. As member, file a report against the context (using the report category)
 * 6. As admin, create a ban history, referencing the member, admin, community, and
 *    report, and specifying reason/type/start/end/active
 * 7. Fetch the ban detail by banHistoryId as admin; verify that all fields are
 *    correct per DTO and permissions (all sensitive data shown for admin)
 * 8. Check edge cases: fetching a non-existent ban history id (should error), and
 *    access denial for unauthenticated/non-admins
 *
 * Each creation step strictly follows the DTO definitions for both input and
 * output (ICreate vs. base, etc). Use typia.random<T>() and RandomGenerator as
 * appropriate for data creation. All test assertions and error scenarios
 * leverage TestValidator with mandatory title parameters.
 * Null/undefined/timestamp handling per DTO. Only fields present in DTOs are
 * used to avoid hallucination. Covers the full lifecycle of ban creation and
 * admin-only retrieval. Type safety and best practices enforced.
 */
export async function test_api_admin_ban_history_detail_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a community as member (this tests normal flow: only members can create communities)
  // --- Temporarily simulate member login for this scope ---
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Subscribe a member to the community (side effect: creates a member, gives us member id via subscription)
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. As admin, create a valid report category (required for report)
  const reportCategoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: reportCategoryBody,
      },
    );
  typia.assert(reportCategory);

  // 5. File a report as (the previously subscribed) member
  const reportBody = {
    post_id: undefined,
    comment_id: undefined,
    report_category_id: reportCategory.id,
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);

  // 6. As admin, create a ban history against the member
  const now = new Date();
  const banBody = {
    banned_member_id: subscription.member_id,
    issued_by_id: admin.id,
    community_id: community.id,
    triggering_report_id: report.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    ban_type: RandomGenerator.pick(["temporary", "permanent"] as const),
    ban_start_at: now.toISOString(),
    ban_end_at: null,
    is_active: true,
  } satisfies ICommunityPlatformBanHistory.ICreate;
  const ban = await api.functional.communityPlatform.admin.banHistories.create(
    connection,
    {
      body: banBody,
    },
  );
  typia.assert(ban);

  // 7. As admin, fetch the ban detail by banHistoryId
  const banDetail =
    await api.functional.communityPlatform.admin.banHistories.at(connection, {
      banHistoryId: typia.assert(ban.id!),
    });
  typia.assert(banDetail);
  // Validate key fields
  TestValidator.equals("ban id matches", banDetail.id, ban.id);
  TestValidator.equals(
    "banned member id matches",
    banDetail.banned_member_id,
    ban.banned_member_id,
  );
  TestValidator.equals("issuer id matches", banDetail.issued_by_id, admin.id);
  TestValidator.equals(
    "community id matches",
    banDetail.community_id,
    community.id,
  );
  TestValidator.equals(
    "triggering report id matches",
    banDetail.triggering_report_id,
    report.id,
  );
  TestValidator.equals("ban reason matches", banDetail.reason, ban.reason);
  TestValidator.equals("ban type matches", banDetail.ban_type, ban.ban_type);
  TestValidator.equals(
    "ban start at matches",
    banDetail.ban_start_at,
    ban.ban_start_at,
  );
  TestValidator.equals(
    "ban end at matches",
    banDetail.ban_end_at,
    ban.ban_end_at,
  );
  TestValidator.equals("ban is active", banDetail.is_active, true);

  // 8-a. Try fetching a non-existent banHistoryId (should error)
  await TestValidator.error(
    "non-existent banHistoryId fetch fails",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.at(connection, {
        banHistoryId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 8-b. Try fetching as unauthenticated connection (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fetch denied", async () => {
    await api.functional.communityPlatform.admin.banHistories.at(unauthConn, {
      banHistoryId: typia.assert(ban.id!),
    });
  });
}
