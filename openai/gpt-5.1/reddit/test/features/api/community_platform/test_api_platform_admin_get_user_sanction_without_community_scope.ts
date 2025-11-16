import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate platform-wide user sanction retrieval without community scope.
 *
 * Business context:
 *
 * - A member user can be sanctioned at the platform level (not tied to a specific
 *   community) as a result of a moderation report.
 * - Platform administrators must be able to retrieve such sanctions and see that
 *   they are platform-wide (community == null) while still being linked to the
 *   motivating report and sanctioned member user.
 *
 * Steps:
 *
 * 1. Register a memberUser (join) to act as the future sanctioned user.
 * 2. As that memberUser, create a report via memberUser.reports.create with no
 *    community_id (platform-level report context).
 * 3. Register a platformAdmin (join) and rely on the SDK to authenticate as this
 *    admin actor.
 * 4. As platformAdmin, create a platform-wide user sanction via
 *    platformAdmin.userSanctions.create, with:
 *
 *    - Community_platform_report_id referencing the report from step 2
 *    - Sanctioned_memberuser_id referencing the member from step 1
 *    - Community_id explicitly null to indicate platform scope
 *    - Sanction_type representing a platform-wide ban
 *    - Status and effective_from/effective_until configured explicitly
 * 5. As platformAdmin, retrieve the sanction using platformAdmin.userSanctions.at
 *    with the created sanction id.
 * 6. Validate that:
 *
 *    - The sanction structure matches ICommunityPlatformUserSanction
 *    - Community is null (no community scope)
 *    - Report.id equals the original report.id
 *    - Sanctioned_memberUser.id equals the member user id
 *    - Sanction_type and status exactly match creation values
 *    - Effective_from and effective_until equal the configured window
 */
export async function test_api_platform_admin_get_user_sanction_without_community_scope(
  connection: api.IConnection,
) {
  // 1. Register a member user that will be the sanctioned subject
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As this member user, create a platform-level report (no community_id)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 3. Register a platform administrator and become platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 4. As platformAdmin, create a platform-wide user sanction (community_id null)
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1h

  const sanctionCreateBody = {
    community_platform_report_id: createdReport.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(createdSanction);

  // Sanity-check basic relationships on creation response
  TestValidator.equals(
    "created sanction links to report",
    createdSanction.report.id,
    createdReport.id,
  );
  TestValidator.equals(
    "created sanction links to member user",
    createdSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  // 5. Retrieve the sanction via GET /communityPlatform/platformAdmin/userSanctions/{userSanctionId}
  const loadedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.at(
      connection,
      {
        userSanctionId: createdSanction.id,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(loadedSanction);

  // 6. Validate platform-wide semantics and field equality
  TestValidator.equals(
    "sanction is platform-wide so community must be null",
    loadedSanction.community,
    null,
  );

  TestValidator.equals(
    "loaded sanction report id matches original report",
    loadedSanction.report.id,
    createdReport.id,
  );

  TestValidator.equals(
    "loaded sanction member user id matches sanctioned member",
    loadedSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "sanction type preserved",
    loadedSanction.sanction_type,
    sanctionCreateBody.sanction_type,
  );

  TestValidator.equals(
    "sanction status preserved",
    loadedSanction.status,
    sanctionCreateBody.status,
  );

  TestValidator.equals(
    "effective_from preserved",
    loadedSanction.effective_from,
    sanctionCreateBody.effective_from,
  );

  TestValidator.equals(
    "effective_until preserved",
    loadedSanction.effective_until,
    sanctionCreateBody.effective_until,
  );
}
