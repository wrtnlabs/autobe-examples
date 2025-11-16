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
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

export async function test_api_platformadmin_moderation_actions_full_text_search_over_notes(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to obtain initial authenticated session
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "password-Admin1!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level as platformAdmin
  const visibilityCode = `code_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Create memberUser via join
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.test`; // still valid email
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail as string & tags.Format<"email">,
    password: "password-Member1!",
    ip: null,
    href: "https://frontend.local/signup",
    referrer: "https://frontend.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Explicit login as memberUser (actor switch clarity)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login",
    referrer: "https://frontend.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. As memberUser, create a community (using created visibility level)
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. As memberUser, create a report for that community
  // We don't have an endpoint to list reason categories; use a random UUID for report_reason_category_id.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 7. Switch back to platformAdmin via login to ensure platformAdmin context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 8. Create two moderation actions on the report as platformAdmin
  const distinctiveKeyword = "contains_rare_keyword_xyz";

  // Action A: includes the keyword in reason_summary
  const moderationCreateBodyA = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: `Action A reason with ${distinctiveKeyword} in text`,
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionA: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBodyA,
      },
    );
  typia.assert(moderationActionA);

  // Action B: deliberately does NOT contain the keyword in any text fields
  const moderationCreateBodyB = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Action B reason without the magic token",
    notes_internal: "Internal notes that should not match the rare token.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationActionB: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBodyB,
      },
    );
  typia.assert(moderationActionB);

  // 9. Call search endpoint with search filter equal to the distinctive keyword
  const searchRequestBody = {
    page: 1,
    limit: 20,
    actionTypes: undefined,
    targetScopes: undefined,
    communityId: community.id,
    reportId: report.id,
    actorType: undefined,
    actorId: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    search: distinctiveKeyword,
    sortField: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const pageResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationActions.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert(pageResult);

  const summaries = pageResult.data;

  // 10. Assertions: ensure only matching actions (containing keyword) are returned.
  // We at least expect Action A to be present.
  const containsActionA = summaries.some(
    (summary) => summary.id === moderationActionA.id,
  );

  TestValidator.predicate(
    "search results must include action A with distinctive keyword",
    containsActionA,
  );

  const containsActionB = summaries.some(
    (summary) => summary.id === moderationActionB.id,
  );

  TestValidator.predicate(
    "search results must not include action B without the keyword",
    () => containsActionB === false,
  );

  // 11. Optional: pagination sanity checks
  TestValidator.predicate(
    "pagination limit is large enough for single-page results",
    pageResult.pagination.limit >= summaries.length,
  );

  TestValidator.equals(
    "pagination.records should equal number of returned data when constrained to one report and single keyword",
    pageResult.pagination.records,
    pageResult.data.length,
  );
}
