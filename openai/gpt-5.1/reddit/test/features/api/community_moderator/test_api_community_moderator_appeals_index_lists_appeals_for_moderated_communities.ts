import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Ensure community moderators can list and filter appeals for their moderated
 * communities.
 *
 * Business flow (adapted to available APIs and DTOs):
 *
 * 1. Register a platform admin, a community moderator, and two member users
 *    (reporter and sanctioned user).
 * 2. As platform admin, create a community visibility level.
 * 3. As member user (reporter), create a community using that visibility level.
 * 4. As the same member user, create a report logically associated with that
 *    community.
 * 5. As community moderator, create a moderation action for that report.
 * 6. As platform admin, create a user sanction tied to the same report and
 *    sanctioned member.
 * 7. As the sanctioned member user, submit multiple appeals, including ones with
 *    appeal_scope "sanction".
 * 8. Create an additional report and appeal to act as unrelated noise.
 * 9. As community moderator, call PATCH
 *    /communityPlatform/communityModerator/appeals with filters:
 *
 *    - Appeal_scope includes only "sanction";
 *    - Created_from/created_until cover the created sanction-scoped appeals;
 *    - Limit is small to exercise pagination.
 * 10. Verify that returned appeal summaries all respect filter criteria and that
 *     pagination metadata is consistent.
 * 11. Verify key ICommunityPlatformAppeal.ISummary fields using typia.assert and
 *     predicate checks.
 * 12. Verify that a plain member user cannot access the moderator appeals index
 *     (authorization enforced).
 */
export async function test_api_community_moderator_appeals_index_lists_appeals_for_moderated_communities(
  connection: api.IConnection,
) {
  // 1. Register actors: platform admin, community moderator, reporter member, sanctioned member
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const sanctionedPassword = RandomGenerator.alphaNumeric(12);

  const platformAdminHref = "https://admin.example.com/join" as string &
    tags.Format<"uri">;
  const platformAdminReferrer = "https://admin.example.com/" as string &
    tags.Format<"uri">;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminHref,
        referrer: platformAdminReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const moderatorHref = "https://mod.example.com/join" as string &
    tags.Format<"uri">;
  const moderatorReferrer = "https://mod.example.com/" as string &
    tags.Format<"uri">;

  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const communityModeratorJoin =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(communityModeratorJoin);

  const memberHref = "https://app.example.com/join" as string &
    tags.Format<"uri">;
  const memberReferrer = "https://app.example.com/landing" as string &
    tags.Format<"uri">;

  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const sanctionedEmail = typia.random<string & tags.Format<"email">>();

  const reporterJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: reporterEmail,
      password: reporterPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(reporterJoin);

  const sanctionedJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: sanctionedEmail,
      password: sanctionedPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(sanctionedJoin);

  // 2. As platformAdmin, ensure a visibility level exists
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoin.email,
      password: platformAdminPassword,
      ip: "127.0.0.1",
      href: platformAdminHref,
      referrer: platformAdminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = "public";
  const visibility =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public",
          description: "Public visibility level for communities",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibility);

  // 3. As reporter member, create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: reporterEmail,
      password: reporterPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As reporter member, create a report logically associated with the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 5. As communityModerator, create a moderation action for that report
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const moderationActionBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Reported content violates rules",
    notes_internal: "Initial moderation decision",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 6. As platform admin, create a user sanction tied to the same report and sanctioned member
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoin.email,
      password: platformAdminPassword,
      ip: "127.0.0.1",
      href: platformAdminHref,
      referrer: platformAdminReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const now = new Date();
  const effectiveFrom = now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const userSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedJoin.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Violation of community guidelines",
    notes_internal: "Applied due to repeated infractions",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionBody,
      },
    );
  typia.assert(sanction);

  // 7. As sanctioned member user, submit multiple appeals (some sanction-scoped)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: sanctionedEmail,
      password: sanctionedPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const sanctionScope = "sanction";

  const sanctionAppeals: ICommunityPlatformAppeal[] = [];
  for (let i = 0; i < 3; i++) {
    const appeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: {
            appeal_scope: sanctionScope,
            reason_summary: `Appeal #${i + 1} for sanction`,
            details: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies ICommunityPlatformAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    sanctionAppeals.push(appeal);
  }

  // Another appeal with different scope to ensure filtering works
  const otherAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: {
          appeal_scope: "content",
          reason_summary: "Appeal for content decision",
          details: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      },
    );
  typia.assert(otherAppeal);

  // 8. Create an extra unrelated report and appeal (noise outside our main report)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: reporterEmail,
      password: reporterPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const otherReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community.id,
          severity: "low",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(otherReport);

  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: sanctionedEmail,
      password: sanctionedPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const unrelatedAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: otherReport.id,
        body: {
          appeal_scope: "sanction",
          reason_summary: "Appeal unrelated to main flow",
          details: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      },
    );
  typia.assert(unrelatedAppeal);

  // Capture time window after creating sanction-scoped appeals
  const createdFrom = sanctionAppeals[0].created_at;
  const createdUntil = sanctionAppeals[sanctionAppeals.length - 1].created_at;

  // 9. As communityModerator, list appeals with filters
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const pageLimit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchRequest: ICommunityPlatformAppeal.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
    appeal_statuses: undefined,
    appeal_scope: [sanctionScope],
    created_from: createdFrom,
    created_until: createdUntil,
    appellant_memberuser_id: null,
    communitymoderator_id: null,
    platformadmin_id: null,
    sort_key: "created_at",
    sort_direction: "desc",
  };

  const page =
    await api.functional.communityPlatform.communityModerator.appeals.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const items = page.data;

  // 10. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination limit should match request limit",
    pagination.limit,
    pageLimit,
  );
  TestValidator.predicate("current page should be 1", pagination.current === 1);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);

  // 11. Validate each returned appeal summary matches filter criteria
  for (const summary of items) {
    typia.assert<ICommunityPlatformAppeal.ISummary>(summary);

    TestValidator.equals(
      "appeal scope filter respected",
      summary.scope,
      sanctionScope,
    );

    TestValidator.predicate(
      "created_at within range",
      summary.created_at >= createdFrom && summary.created_at <= createdUntil,
    );

    TestValidator.predicate(
      "id is non-empty string",
      typeof summary.id === "string" && summary.id.length > 0,
    );

    if (summary.reportId !== undefined) {
      TestValidator.predicate(
        "reportId is non-empty string when present",
        typeof summary.reportId === "string" && summary.reportId.length > 0,
      );
    }

    TestValidator.predicate(
      "status is non-empty string",
      summary.status.length > 0,
    );

    TestValidator.predicate(
      "reason_summary non-empty",
      summary.reason_summary.length > 0,
    );

    TestValidator.predicate(
      "target_type non-empty",
      summary.target_type.length > 0,
    );
  }

  // 12. Basic negative check: a memberUser should not be able to call moderator index
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: reporterEmail,
      password: reporterPassword,
      ip: "127.0.0.1",
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  await TestValidator.error(
    "member user cannot access communityModerator appeals index",
    async () => {
      await api.functional.communityPlatform.communityModerator.appeals.index(
        connection,
        { body: searchRequest },
      );
    },
  );
}
