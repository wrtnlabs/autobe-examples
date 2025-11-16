import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_user_sanction_update_change_status_and_duration(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator (platformAdmin actor)
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);
  const platformAdminEmail = `${RandomGenerator.alphabets(8)}@admin.example.com`;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: platformAdminEmail as string & tags.Format<"email">,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // 2. Register and authenticate a member user (memberUser actor)
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.example.com`;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail as string & tags.Format<"email">,
      password: memberPassword,
      ip: RandomGenerator.alphabets(8),
      href: "https://app.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://app.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const memberUserId = memberJoin.id;

  // 3. As memberUser, create a motivating report
  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: null,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 4. Switch to platformAdmin and create a community visibility level
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `code-${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 5. Switch back to memberUser and create a community scoped to that visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://app.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Switch again to platformAdmin to create an initial user sanction
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const createSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUserId,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Initial temporary community ban for policy violation",
    notes_internal: "Created for E2E test scenario; will be updated shortly.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: createSanctionBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(createdSanction);

  // Capture identifiers and original mutable fields
  const originalId = createdSanction.id;
  const originalReportId = createdSanction.report.id;
  const originalSanctionedMemberId = createdSanction.sanctioned_memberUser.id;
  const originalCommunityId = createdSanction.community?.id ?? null;
  const originalStatus = createdSanction.status;
  const originalEffectiveFrom = createdSanction.effective_from;
  const originalEffectiveUntil = createdSanction.effective_until ?? null;
  const originalUpdatedAt = createdSanction.updated_at;

  // 7. Build update payload: change status and effective_until, plus notes
  const newEffectiveUntil = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    status: "revoked",
    effective_until: newEffectiveUntil,
    reason_summary: "Sanction revoked early after review.",
    notes_internal: "Updated by E2E test to simulate status/duration change.",
  } satisfies ICommunityPlatformUserSanction.IUpdate;

  const updatedSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.update(
      connection,
      {
        userSanctionId: createdSanction.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(updatedSanction);

  // 8. Business assertions
  TestValidator.equals(
    "sanction id should remain stable after update",
    updatedSanction.id,
    originalId,
  );

  TestValidator.equals(
    "report linkage must remain unchanged",
    updatedSanction.report.id,
    originalReportId,
  );

  TestValidator.equals(
    "sanctioned member user linkage must remain unchanged",
    updatedSanction.sanctioned_memberUser.id,
    originalSanctionedMemberId,
  );

  if (originalCommunityId !== null) {
    TestValidator.equals(
      "community scope should remain unchanged",
      updatedSanction.community?.id ?? null,
      originalCommunityId,
    );
  }

  TestValidator.equals(
    "status should be updated to new value",
    updatedSanction.status,
    "revoked",
  );

  TestValidator.equals(
    "effective_from must remain unchanged after update",
    updatedSanction.effective_from,
    originalEffectiveFrom,
  );

  TestValidator.equals(
    "effective_until should be updated to new timestamp",
    updatedSanction.effective_until ?? null,
    newEffectiveUntil,
  );

  TestValidator.notEquals(
    "updated_at must advance after update",
    updatedSanction.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "reason_summary should reflect updated reason",
    updatedSanction.reason_summary ?? null,
    updateBody.reason_summary ?? null,
  );

  TestValidator.equals(
    "notes_internal should reflect updated internal notes",
    updatedSanction.notes_internal ?? null,
    updateBody.notes_internal ?? null,
  );
}
