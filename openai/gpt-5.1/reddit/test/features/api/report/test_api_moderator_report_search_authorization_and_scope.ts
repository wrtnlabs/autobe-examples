import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderator_report_search_authorization_and_scope(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join directly issues tokens)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platformAdmin, create a visibility level to be used by communities
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityLevelCreate = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Public communities visible to all users.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreate },
    );
  typia.assert(visibilityLevel);

  // 3. Create two distinct member users via join
  const member1Email = `${RandomGenerator.alphabets(8)}@member.test` as string &
    tags.Format<"email">;
  const member2Email = `${RandomGenerator.alphabets(8)}@member.test` as string &
    tags.Format<"email">;

  const member1JoinBody = {
    username: RandomGenerator.alphabets(10),
    email: member1Email,
    password: "MemberPassword!234",
    ip: "127.0.0.1",
    href: "https://app.test/member/join1",
    referrer: "https://app.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const member1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member1JoinBody,
    });
  typia.assert(member1);

  const member2JoinBody = {
    username: RandomGenerator.alphabets(10),
    email: member2Email,
    password: "MemberPassword!234",
    ip: "127.0.0.1",
    href: "https://app.test/member/join2",
    referrer: "https://app.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const member2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member2JoinBody,
    });
  typia.assert(member2);

  // 4. As memberUser1, create community A
  const communityASlug = `community-a-${RandomGenerator.alphabets(6)}`;
  const communityACreate = {
    identifier: communityASlug,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreate,
      },
    );
  typia.assert(communityA);

  // 5. As memberUser2, create community B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: member2Email,
      password: "MemberPassword!234",
      ip: "127.0.0.1",
      href: "https://app.test/member/login2",
      referrer: "https://app.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityBSlug = `community-b-${RandomGenerator.alphabets(6)}`;
  const communityBCreate = {
    identifier: communityBSlug,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreate,
      },
    );
  typia.assert(communityB);

  // 6. As platformAdmin, create a report reason category
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdmin.email,
      password: adminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.test/login",
      referrer: "https://admin.console.test/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const reasonCategoryCode = `spam_${RandomGenerator.alphabets(6)}`;
  const reasonCategoryCreate = {
    code: reasonCategoryCode,
    name: "Spam or advertising",
    description: "Unsolicited or repetitive commercial content.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;
  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryCreate },
    );
  typia.assert(reasonCategory);

  // 7. As memberUser1, create report(s) in community A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: member1Email,
      password: "MemberPassword!234",
      ip: "127.0.0.1",
      href: "https://app.test/member/login1",
      referrer: "https://app.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const reportA1Create = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: communityA.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const reportA1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportA1Create,
      },
    );
  typia.assert(reportA1);

  // 8. As memberUser2, create report(s) in community B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: member2Email,
      password: "MemberPassword!234",
      ip: "127.0.0.1",
      href: "https://app.test/member/login2b",
      referrer: "https://app.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const reportB1Create = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: communityB.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const reportB1: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportB1Create,
      },
    );
  typia.assert(reportB1);

  // 9. Register a community moderator via join (auto-login as moderator)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.test`,
    password: "ModeratorPassword!234",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.console.test/join",
    referrer: "https://mod.console.test/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  // 10. As communityModerator, search reports scoped to community A only
  const searchBodyForCommunityA = {
    page: 1,
    pageSize: 50,
    statuses: undefined,
    reporter_types: undefined,
    severity_levels: undefined,
    community_ids: [communityA.id],
    reason_category_ids: [reasonCategory.id],
    created_from: null,
    created_to: null,
    resolved_from: null,
    resolved_to: null,
    description_query: null,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformReport.IRequest;
  const searchResultA: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      { body: searchBodyForCommunityA },
    );
  typia.assert(searchResultA);

  // Basic sanity: at least one result and includes the report from community A
  TestValidator.predicate(
    "moderator search should return at least one report for community A",
    searchResultA.data.length > 0,
  );

  const foundReportA = searchResultA.data.find(
    (summary) => summary.id === reportA1.id,
  );
  TestValidator.predicate(
    "search results contain the report from community A",
    foundReportA !== undefined,
  );

  // Ensure all returned reports use the created reason category
  for (const summary of searchResultA.data) {
    TestValidator.equals(
      "all summaries should use the created reason category",
      summary.reasonCategory.id,
      reasonCategory.id,
    );
  }

  // Ensure that the report from community B is not included when filtering by community A
  const foundReportBInA = searchResultA.data.find(
    (summary) => summary.id === reportB1.id,
  );
  TestValidator.predicate(
    "search results filtered to community A must not include reports from community B",
    foundReportBInA === undefined,
  );

  // 11. As a regular member user, calling moderator search should be rejected
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: member1Email,
      password: "MemberPassword!234",
      ip: "127.0.0.1",
      href: "https://app.test/member/login1-final",
      referrer: "https://app.test/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  await TestValidator.error(
    "non-moderator member user must not be allowed to call moderator search endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.search.reports.index(
        connection,
        { body: searchBodyForCommunityA },
      );
    },
  );
}
