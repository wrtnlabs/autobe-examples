import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

/**
 * Validate platform-admin-level search of community bans with full platform
 * context.
 *
 * Business goal
 *
 * - Ensure a platform administrator, operating through the platformAdmin
 *   endpoints, can search community-level bans for a specific community, with
 *   all prerequisite platform master data configured and with at least one
 *   actual ban record present.
 * - Verify that the platform-wide configuration surfaces (visibility levels,
 *   account statuses, platform settings, content policy categories, report
 *   reason categories) are usable in a realistic flow and that they integrate
 *   correctly into the community + ban model.
 * - Confirm that the PATCH-based search endpoint correctly paginates, respects
 *   filters such as is_active and policy_category, and isolates results to the
 *   specified communityIdentifier.
 *
 * Scenario steps
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join.
 *
 *    - Use realistic username/email/password and connection metadata (href,
 *         referrer).
 *    - Response: ICommunityPlatformPlatformadmin.IAuthorized; SDK will also set
 *         Authorization header on the connection.
 * 2. (Optional but realistic) Re-login this platform admin via
 *    /auth/platformAdmin/login to demonstrate actor switching is safe (not
 *    strictly required, but aligns with dependencies list).
 * 3. As platform admin, create required master data: a. Create an account status
 *    via POST /communityPlatform/platformAdmin/accountStatuses using
 *    ICommunityPlatformAccountStatus.ICreate. b. Create a visibility level via
 *    POST /communityPlatform/platformAdmin/communityVisibilityLevels using
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate. c. Create at least one
 *    platform setting via POST
 *    /communityPlatform/platformAdmin/platformSettings using
 *    ICommunityPlatformPlatformSetting.ICreate (for example a generic
 *    ban-related configuration key). d. Create a content policy category via
 *    POST /communityPlatform/platformAdmin/contentPolicyCategories using
 *    ICommunityPlatformContentPolicyCategory.ICreate. e. Create a report reason
 *    category via POST /communityPlatform/platformAdmin/reportReasonCategories
 *    using ICommunityPlatformReportReasonCategory.ICreate.
 *
 *    - For each create call, assert the response type with typia.assert and keep
 *         important identifying fields (codes, keys) for later use.
 * 4. Register a member user via /auth/memberUser/join using
 *    ICommunityPlatformMemberuser.IJoinRequest.
 *
 *    - Use a random email, username, and reasonable password.
 *    - Provide href/referrer URIs as required.
 *    - Response: ICommunityPlatformMemberuser.IAuthorized; typia.assert it.
 * 5. Login as this member user via /auth/memberUser/login so that the subsequent
 *    memberUser-scoped community creation call runs under the correct actor.
 *
 *    - Body: ICommunityPlatformMemberuser.ILoginRequest.
 * 6. As member user, create a community via POST
 *    /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate:
 *
 *    - Identifier: random slug-like value.
 *    - Title: random name.
 *    - Description: optional random paragraph.
 *    - VisibilityLevelCode: the visibility level code created in step 3b.
 *    - IsNsfw: false.
 *    - PrimaryTagIds: omitted (no tags needed for this test).
 *    - Response: ICommunityPlatformCommunity; typia.assert it and hold
 *         community.identifier for use as communityIdentifier path parameter.
 * 7. Switch actor back to platform admin using /auth/platformAdmin.login so that
 *    platformAdmin-scoped community bans endpoints can be used.
 * 8. As platform admin, create at least one ban for the created community via POST
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/bans
 *    using ICommunityPlatformCommunityBan.ICreate.
 *
 *    - CommunityIdentifier: the community.identifier from step 6.
 *    - Memberuser_id: the id from the memberUser authorized response.
 *    - Reason: short paragraph.
 *    - Policy_category: set to the content policy category code created in step 3d.
 *    - Started_at: explicit ISO string (now).
 *    - Expires_at: null (permanent ban) or a time in the future.
 *    - Response: ICommunityPlatformCommunityBan; typia.assert it.
 * 9. (Optional but useful for isolation) Create a second community (via member
 *    user) and optionally a ban in that second community so that we can prove
 *    that the search endpoint for the first community does not leak bans from
 *    other communities.
 *
 *    - For brevity and simplicity, this test can skip creating cross-community bans;
 *         scoping behavior is already implied by the path parameter.
 * 10. Call the target search endpoint PATCH
 *     /communityPlatform/platformAdmin/communities/{communityIdentifier}/bans
 *     using ICommunityPlatformCommunityBan.IRequest for the body.
 *
 *     A. First search: baseline pagination without filters.
 *
 *     - Body: { page: 1, limit: 10 }.
 *     - Response: IPageICommunityPlatformCommunityBan.ISummary.
 *     - Assertions:
 *
 *               - Typia.assert on the response.
 *               - Pagination.current should equal 1.
 *               - Pagination.limit should be >= 1.
 *               - Pagination.records should be >= 1.
 *               - At least one item in data has id equal to the ban.id from step 8.
 *               - The community.id of that item should equal the community.id from step 6.
 *               - The memberUser.id should equal the member user id.
 *               - Is_active should be true.
 *               - Policy_category should equal the policy category code used when creating the
 *                           ban.
 *
 *     B. Second search: filtered by is_active and policy_category.
 *
 *     - Body: { page: 1, limit: 10, is_active: true, policy_category: <policy code
 *           from 3d>, }.
 *     - Response: IPageICommunityPlatformCommunityBan.ISummary.
 *     - Assertions:
 *
 *               - Typia.assert on the response.
 *               - All returned data entries have is_active === true.
 *               - All returned data entries have policy_category equal to the selected policy
 *                           code (or null only if no items).
 *               - If there is at least one record, at least one of them has id equal to the
 *                           created ban.id.
 * 11. Optionally, call another search with filters that intentionally should return
 *     an empty page, such as:
 *
 *     - Is_active: false
 *     - Policy_category: some other random code.
 *     - Assertions:
 *
 *               - Pagination.records === 0 implies data.length === 0.
 * 12. Use TestValidator for key logical assertions, with descriptive titles so
 *     failures make sense in test output. Use typia.assert for structural type
 *     checking of responses.
 */
export async function test_api_platform_admin_search_bans_with_full_platform_context(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.test/join",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const platformAdminEmail = platformAdminAuth.email;
  const platformAdminUsername = platformAdminAuth.username;

  // 2. Re-login as platform admin (explicit actor switch demonstration)
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.test/login",
    referrer: "https://admin.console.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  TestValidator.equals(
    "platform admin username stays consistent after login",
    platformAdminLogin.username,
    platformAdminUsername,
  );

  // 3a. Create an account status master entry
  const accountStatusKey = `ACTIVE_${RandomGenerator.alphabets(5).toUpperCase()}`;
  const accountStatusBody = {
    key: accountStatusKey,
    label: "Active",
    description: "Active account status for testing.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  TestValidator.equals(
    "created account status key matches requested key",
    accountStatus.key,
    accountStatusKey,
  );

  // 3b. Create a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(4)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E testing.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3c. Create a platform setting (generic, but realistic)
  const platformSettingKey = `ban.max_duration_days.${RandomGenerator.alphabets(4)}`;
  const platformSettingBody = {
    key: platformSettingKey,
    value: "30",
    description: "Maximum community ban duration in days for test scenario.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: platformSettingBody },
    );
  typia.assert(platformSetting);

  TestValidator.equals(
    "platform setting key persists correctly",
    platformSetting.key,
    platformSettingKey,
  );

  // 3d. Create a content policy category
  const policyCategoryCode = `harassment_${RandomGenerator.alphabets(4)}`;
  const contentPolicyCategoryBody = {
    code: policyCategoryCode,
    name: "Harassment Test Category",
    description:
      "Content policy category for testing community bans related to harassment.",
    isActive: true,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const contentPolicyCategory: ICommunityPlatformContentPolicyCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      { body: contentPolicyCategoryBody },
    );
  typia.assert(contentPolicyCategory);

  TestValidator.equals(
    "content policy category code matches",
    contentPolicyCategory.code,
    policyCategoryCode,
  );

  // 3e. Create a report reason category
  const reportReasonCode = `spam_${RandomGenerator.alphabets(4)}`;
  const reportReasonCategoryBody = {
    code: reportReasonCode,
    name: "Spam Test Reason",
    description: "Report reason category for spam-related test cases.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reportReasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reportReasonCategoryBody },
    );
  typia.assert(reportReasonCategory);

  TestValidator.equals(
    "report reason category code matches",
    reportReasonCategory.code,
    reportReasonCode,
  );

  // 4. Register a member user
  const memberUsername = `member_${RandomGenerator.alphabets(6)}`;
  const memberEmail =
    `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://community.test/join",
    referrer: "https://community.test/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberId = memberAuth.id;

  // 5. Login as member user
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.test/login",
    referrer: "https://community.test/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  TestValidator.equals(
    "member user id remains the same after login",
    memberLogin.id,
    memberId,
  );

  // 6. Create a community as the member user
  const communityIdentifier = `comm_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier in response matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 7. Switch back to platform admin for ban management
  const platformAdminReloginBody = {
    identifier: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.test/login2",
    referrer: "https://admin.console.test/landing2",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminRelogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminReloginBody,
    });
  typia.assert(platformAdminRelogin);

  // 8. Create a community-level ban for the created member in this community
  const now = new Date();
  const startedAt = now.toISOString();

  const banCreateBody = {
    memberuser_id: memberId,
    reason: "Test ban for harassment in this community.",
    policy_category: policyCategoryCode,
    started_at: startedAt,
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "ban member user id matches targeted member",
    createdBan.memberUser.id,
    memberId,
  );

  TestValidator.equals(
    "ban community id matches targeted community",
    createdBan.community.id,
    community.id,
  );

  // 10a. First search: baseline pagination without filters
  const baselineSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const baselinePage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: baselineSearchBody,
      },
    );
  typia.assert(baselinePage);

  const pagination: IPage.IPagination = baselinePage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "baseline search current page is 1",
    pagination.current,
    1,
  );

  TestValidator.predicate(
    "baseline search limit is positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "baseline search has at least one record",
    pagination.records >= 1,
  );

  const baselineData = baselinePage.data;

  TestValidator.predicate(
    "search data includes at least one ban",
    baselineData.length >= 1,
  );

  // Find our specific ban in baseline results
  const foundBaselineBan = baselineData.find((b) => b.id === createdBan.id);
  TestValidator.predicate(
    "baseline search includes the created ban",
    foundBaselineBan !== undefined,
  );

  if (foundBaselineBan !== undefined) {
    typia.assert(foundBaselineBan);

    TestValidator.equals(
      "found ban belongs to the same community",
      foundBaselineBan.community.id,
      community.id,
    );

    TestValidator.equals(
      "found ban member user id matches",
      foundBaselineBan.memberUser.id,
      memberId,
    );

    TestValidator.equals(
      "found ban policy category matches",
      foundBaselineBan.policy_category ?? null,
      policyCategoryCode,
    );

    TestValidator.predicate(
      "found ban is marked active",
      foundBaselineBan.is_active === true,
    );
  }

  // 10b. Second search: filtered by is_active and policy_category
  const filteredSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    is_active: true,
    started_from: null,
    started_to: null,
    expires_from: null,
    expires_to: null,
    policy_category: policyCategoryCode,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const filteredPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: filteredSearchBody,
      },
    );
  typia.assert(filteredPage);

  const filteredData = filteredPage.data;

  // If there are records, ensure all match filters
  if (filteredData.length > 0) {
    await ArrayUtil.asyncForEach(filteredData, async (ban) => {
      typia.assert(ban);

      TestValidator.predicate("filtered ban is active", ban.is_active === true);

      TestValidator.equals(
        "filtered ban policy category matches filter",
        ban.policy_category ?? null,
        policyCategoryCode,
      );

      TestValidator.equals(
        "filtered ban community is the scoped community",
        ban.community.id,
        community.id,
      );
    });

    const foundFilteredBan = filteredData.find((b) => b.id === createdBan.id);
    TestValidator.predicate(
      "filtered search includes the created ban",
      foundFilteredBan !== undefined,
    );
  }

  // 11. Third search: filter that should likely yield zero results (inactive + different policy code)
  const nonMatchingPolicyCode = `unrelated_${RandomGenerator.alphabets(4)}`;

  const emptySearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    is_active: false,
    started_from: null,
    started_to: null,
    expires_from: null,
    expires_to: null,
    policy_category: nonMatchingPolicyCode,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const emptyPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: emptySearchBody,
      },
    );
  typia.assert(emptyPage);

  TestValidator.predicate(
    "empty filter search returns zero or more records but no matching created ban",
    emptyPage.data.find((b) => b.id === createdBan.id) === undefined,
  );
}
