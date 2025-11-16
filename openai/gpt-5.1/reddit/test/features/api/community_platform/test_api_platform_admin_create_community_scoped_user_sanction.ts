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

/**
 * Validate that a platform administrator can create a community-scoped user
 * sanction.
 *
 * Business flow:
 *
 * 1. Register a platform administrator and implicitly authenticate.
 * 2. As the platform admin, create a visibility level that communities can use.
 * 3. Register a member user and implicitly authenticate as that member.
 * 4. As the member user, create a community using the seeded visibility level.
 * 5. As the member user, create a report that is scoped to the created community.
 * 6. Re-authenticate as the platform admin.
 * 7. As the platform admin, create a user sanction using the report, targeting the
 *    member user, and scoping it to the community.
 * 8. Assert that the sanction response is well-formed and that it reflects
 *    community-level scoping (non-null community whose id matches the
 *    community) and preserves sanction_type and status.
 */
export async function test_api_platform_admin_create_community_scoped_user_sanction(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and get authorized context
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.mobile(),
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a visibility level
  const visibilityCode = RandomGenerator.alphaNumeric(8);
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user and implicitly authenticate
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. As memberUser, create a report scoped to this community
  const reportReasonCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: community.id,
    severity: "high",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6. Re-authenticate as platform admin via login
  const platformAdminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: platformAdminLoginHref,
        referrer: platformAdminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginResult);

  // 7. As platform admin, create a community-scoped user sanction
  const now = new Date();
  const effectiveFrom = now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntilDate = new Date(now.getTime() + 60 * 60 * 1000);
  const effectiveUntil = effectiveUntilDate.toISOString() as string &
    tags.Format<"date-time">;

  const sanctionType = "temporary_community_ban";
  const status = "active";

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: sanctionType,
    status,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // 8. Validate sanction structure and community scoping semantics
  TestValidator.equals(
    "sanction.report.id should match created report id",
    sanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member id should match member user id",
    sanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.predicate(
    "sanction.community should not be null or undefined for community-scoped sanction",
    sanction.community !== null && sanction.community !== undefined,
  );

  if (sanction.community !== null && sanction.community !== undefined) {
    TestValidator.equals(
      "sanction.community.id should match community id",
      sanction.community.id,
      community.id,
    );
  }

  TestValidator.equals(
    "sanction_type should be preserved",
    sanction.sanction_type,
    sanctionType,
  );

  TestValidator.equals("status should be preserved", sanction.status, status);

  TestValidator.equals(
    "effective_from should equal requested effective_from",
    sanction.effective_from,
    effectiveFrom,
  );

  TestValidator.equals(
    "effective_until should equal requested effective_until",
    sanction.effective_until,
    effectiveUntil,
  );
}
