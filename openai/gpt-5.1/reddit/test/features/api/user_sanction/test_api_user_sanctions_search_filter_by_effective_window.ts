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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSanction";

export async function test_api_user_sanctions_search_filter_by_effective_window(
  connection: api.IConnection,
) {
  // 1. Create platform admin and member user
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@admin.test`,
        password: "password-Admin1",
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://admin.console.test/join",
        referrer: "https://admin.console.test/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphabets(8)}@member.test` as string &
        tags.Format<"email">,
      password: "password-Member1",
      ip: undefined,
      href: "https://community.test/signup" as string & tags.Format<"uri">,
      referrer: "https://community.test/home" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 2. Create visibility level as platform admin (join already authenticated us)
  const visibilityCode = `code_${RandomGenerator.alphabets(6)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Login as member user (switch actor explicitly)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoin.email,
      password: "password-Member1",
      ip: null,
      href: "https://community.test/login" as string & tags.Format<"uri">,
      referrer: "https://community.test/home" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // 4. Create a community as member user
  const communityIdentifier = `comm_${RandomGenerator.alphabets(6)}`;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: `Community ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a report as member user
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();
  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: reportReasonCategoryId,
          community_id: community.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 6. Switch back to platform admin for creating sanctions
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoin.email,
      password: "password-Admin1",
      ip: null,
      href: "https://admin.console.test/login" as string & tags.Format<"uri">,
      referrer: "https://admin.console.test/home" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const memberId = memberJoin.id;

  // Sanction A: effective_from = now - 2 days, effective_until = now - 1 day (expired)
  const effectiveFromA = new Date(now.getTime() - 2 * oneDayMs).toISOString();
  const effectiveUntilA = new Date(now.getTime() - 1 * oneDayMs).toISOString();

  // Sanction B: effective_from = now - 1 day, effective_until = now + 1 day (active)
  const effectiveFromB = new Date(now.getTime() - oneDayMs).toISOString();
  const effectiveUntilB = new Date(now.getTime() + oneDayMs).toISOString();

  // Sanction C: effective_from = now + 1 day, effective_until = now + 3 days (future)
  const effectiveFromC = new Date(now.getTime() + oneDayMs).toISOString();
  const effectiveUntilC = new Date(now.getTime() + 3 * oneDayMs).toISOString();

  const sanctionA =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberId,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "expired",
          effective_from: effectiveFromA,
          effective_until: effectiveUntilA,
          reason_summary: "Past sanction A",
          notes_internal: "E2E test sanction A",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(sanctionA);

  const sanctionB =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberId,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: effectiveFromB,
          effective_until: effectiveUntilB,
          reason_summary: "Active sanction B",
          notes_internal: "E2E test sanction B",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(sanctionB);

  const sanctionC =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberId,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "scheduled",
          effective_from: effectiveFromC,
          effective_until: effectiveUntilC,
          reason_summary: "Future sanction C",
          notes_internal: "E2E test sanction C",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(sanctionC);

  // 7. Query by effective_from window: from now - 2 days to now (inclusive)
  const fromFrom = new Date(now.getTime() - 2 * oneDayMs).toISOString();
  const fromTo = now.toISOString();

  const pageByFrom =
    await api.functional.communityPlatform.platformAdmin.userSanctions.index(
      connection,
      {
        body: {
          sanctioned_memberuser_id: memberId,
          effective_from_from: fromFrom,
          effective_from_to: fromTo,
          page: 1 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformUserSanction.IRequest,
      },
    );
  typia.assert(pageByFrom);

  const idsByFrom = pageByFrom.data.map((s) => s.id);

  TestValidator.predicate(
    "sanction B should be returned when filtering by effective_from window",
    idsByFrom.includes(sanctionB.id),
  );

  TestValidator.predicate(
    "sanction A should be included at lower inclusive bound of effective_from_from",
    idsByFrom.includes(sanctionA.id),
  );

  TestValidator.predicate(
    "sanction C should not be in effective_from window that ends at now",
    !idsByFrom.includes(sanctionC.id),
  );

  // 8. Query by effective_until window: from now - 1 day to now + 2 days (inclusive)
  const untilFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const untilTo = new Date(now.getTime() + 2 * oneDayMs).toISOString();

  const pageByUntil =
    await api.functional.communityPlatform.platformAdmin.userSanctions.index(
      connection,
      {
        body: {
          sanctioned_memberuser_id: memberId,
          effective_until_from: untilFrom,
          effective_until_to: untilTo,
          page: 1 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformUserSanction.IRequest,
      },
    );
  typia.assert(pageByUntil);

  const idsByUntil = pageByUntil.data.map((s) => s.id);

  TestValidator.predicate(
    "sanction B should be returned when filtering by effective_until window",
    idsByUntil.includes(sanctionB.id),
  );

  TestValidator.predicate(
    "sanction C should not be returned when effective_until_to is before its end",
    !idsByUntil.includes(sanctionC.id),
  );

  TestValidator.predicate(
    "sanction A should not be returned when effective_until_from is after its end",
    !idsByUntil.includes(sanctionA.id),
  );
}
