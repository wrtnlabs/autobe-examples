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
 * Validate that platform admin appeals index supports multi-status filters and
 * actor scoping.
 *
 * Business flow (simplified to what is implementable with given APIs):
 *
 * 1. Create a platform admin, community moderator, and two member users (A and B)
 *    via auth join endpoints.
 * 2. As platform admin, create a community visibility level (to satisfy
 *    dependency, though not used directly).
 * 3. As member users A and B, create at least one report each via
 *    memberUser.reports.create.
 * 4. As community moderator, create moderation actions referencing those reports.
 * 5. As platform admin, create user sanctions for member A and B referencing the
 *    reports.
 * 6. As member users A and B, submit appeals via memberUser.appeals.create to
 *    generate appeal records.
 * 7. As platform admin, call platformAdmin.appeals.index once with broad filters
 *    to discover available appeal_status values.
 * 8. Build a multi-status filter from the discovered statuses (up to two distinct
 *    values) and query again with appellant_memberuser_id pointing to member A;
 *    verify that all returned appeals match both the statuses and appellant,
 *    and that created_at is sorted desc.
 * 9. Repeat the filtered call for member B and verify that results (if any) are
 *    scoped to B and share the same allowed statuses.
 */
export async function test_api_platform_admin_appeals_index_supports_multi_status_and_actor_filters(
  connection: api.IConnection,
) {
  // 1. Register actors: platform admin, moderator, member A, member B.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const memberAJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://member.example.com/a/join",
    referrer: "https://member.example.com/a/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  const memberBJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://member.example.com/b/join",
    referrer: "https://member.example.com/b/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 2. As platform admin (already authenticated from join), create a visibility level.
  const visibilityCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 3. Member A and B create reports.
  // Switch to member A via login.
  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.example.com/a/home",
    referrer: "https://member.example.com/a/login",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const reportA1Body = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportA1Body,
      },
    );
  typia.assert(reportA1);

  const reportA2Body = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA2: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportA2Body,
      },
    );
  typia.assert(reportA2);

  // Switch to member B.
  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.example.com/b/home",
    referrer: "https://member.example.com/b/login",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  const reportB1Body = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "high",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportB1Body,
      },
    );
  typia.assert(reportB1);

  // 4. As community moderator, create moderation actions for the reports.
  const moderatorLoginBody = {
    identifier: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/home",
    referrer: "https://moderator.example.com/login",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  const moderationActionA1Body = {
    community_id: null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionA1Body,
      },
    );
  typia.assert(moderationActionA1);

  const moderationActionB1Body = {
    community_id: null,
    action_type: "restrict_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionB1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionB1Body,
      },
    );
  typia.assert(moderationActionB1);

  // 5. As platform admin, create user sanctions for member A and B.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/home",
    referrer: "https://admin.example.com/login",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  const now = new Date();
  const sanctionA1Body = {
    community_platform_report_id: reportA1.id,
    sanctioned_memberuser_id: memberAAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanctionA1: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionA1Body,
      },
    );
  typia.assert(sanctionA1);

  const sanctionB1Body = {
    community_platform_report_id: reportB1.id,
    sanctioned_memberuser_id: memberBAuthorized.id,
    community_id: null,
    sanction_type: "warning",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: null,
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanctionB1: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionB1Body,
      },
    );
  typia.assert(sanctionB1);

  // 6. As member A and B, create appeals.
  const memberALoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAgain);

  const appealA1Body = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appealA1: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealA1Body,
      },
    );
  typia.assert(appealA1);

  const appealA2Body = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appealA2: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealA2Body,
      },
    );
  typia.assert(appealA2);

  const memberBLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoginAgain);

  const appealB1Body = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appealB1: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealB1Body,
      },
    );
  typia.assert(appealB1);

  // 7. As platform admin, call appeals.index with broad filter to collect statuses.
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const broadRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const broadPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert(broadPage);

  const allAppeals = broadPage.data;
  TestValidator.predicate(
    "broad index should return at least one appeal",
    allAppeals.length > 0,
  );

  const distinctStatuses: string[] = [];
  for (const appeal of allAppeals) {
    if (!distinctStatuses.includes(appeal.status))
      distinctStatuses.push(appeal.status);
  }

  TestValidator.predicate(
    "at least one distinct appeal status should exist",
    distinctStatuses.length > 0,
  );

  const selectedStatuses =
    distinctStatuses.length >= 2
      ? [distinctStatuses[0], distinctStatuses[1]]
      : [distinctStatuses[0]];

  // 8. Filtered query for member A with multi-status and sorting by created_at desc.
  const filterForMemberA: ICommunityPlatformAppeal.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: selectedStatuses,
    created_from: null,
    created_until: null,
    appellant_memberuser_id: memberAAuthorized.id,
    sort_key: "created_at",
    sort_direction: "desc",
  };

  const pageForMemberA: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      {
        body: filterForMemberA,
      },
    );
  typia.assert(pageForMemberA);

  const appealsForMemberA = pageForMemberA.data;

  TestValidator.predicate(
    "appeals index for member A should return at least one row",
    appealsForMemberA.length > 0,
  );

  for (const appeal of appealsForMemberA) {
    TestValidator.predicate(
      "appeal status must be in selectedStatuses for member A filter",
      selectedStatuses.includes(appeal.status),
    );

    if (appeal.appellant !== undefined) {
      TestValidator.equals(
        "appellant id must match member A id when appellant present",
        appeal.appellant.id,
        memberAAuthorized.id,
      );
    }
  }

  // Verify created_at ordering (desc) for member A results.
  for (let i = 1; i < appealsForMemberA.length; i++) {
    const prev = appealsForMemberA[i - 1];
    const curr = appealsForMemberA[i];
    TestValidator.predicate(
      "created_at must be non-increasing in desc order for member A",
      prev.created_at >= curr.created_at,
    );
  }

  // 9. Filtered query for member B using same statuses.
  const filterForMemberB: ICommunityPlatformAppeal.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    appeal_statuses: selectedStatuses,
    created_from: null,
    created_until: null,
    appellant_memberuser_id: memberBAuthorized.id,
    sort_key: "created_at",
    sort_direction: "desc",
  };

  const pageForMemberB: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.platformAdmin.appeals.index(
      connection,
      {
        body: filterForMemberB,
      },
    );
  typia.assert(pageForMemberB);

  const appealsForMemberB = pageForMemberB.data;

  for (const appeal of appealsForMemberB) {
    TestValidator.predicate(
      "appeal status must be in selectedStatuses for member B filter",
      selectedStatuses.includes(appeal.status),
    );

    if (appeal.appellant !== undefined) {
      TestValidator.equals(
        "appellant id must match member B id when appellant present",
        appeal.appellant.id,
        memberBAuthorized.id,
      );
    }
  }

  // Verify that member A and B filtered results do not overlap by id when both non-empty.
  if (appealsForMemberA.length > 0 && appealsForMemberB.length > 0) {
    const idsA = appealsForMemberA.map((a) => a.id);
    const idsB = appealsForMemberB.map((a) => a.id);
    const overlap = idsA.some((id) => idsB.includes(id));
    TestValidator.predicate(
      "appeal id sets for member A and member B should not overlap",
      overlap === false,
    );
  }
}
