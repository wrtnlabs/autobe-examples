import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorAssignment";

export async function test_api_platform_admin_lists_moderator_assignments_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create ACTIVE account status
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Active",
    description: "Active accounts can login, post, and vote.",
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

  // 3. As platformAdmin, create visibility level
  const visibilityCode = `public-auto-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public (Auto Test)",
    description: "Auto-generated visibility level for E2E test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register memberUser
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberP@ss1",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4-1. Login as memberUser to ensure auth context
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedLogin);

  // 5. As memberUser, create a community
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 6. Switch back to platformAdmin context using login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  // 7. Create multiple moderator assignments for the community
  const now = new Date();

  const assignments: ICommunityPlatformCommunityModeratorAssignment[] = [];

  const assignmentInputs: ICommunityPlatformCommunityModeratorAssignment.ICreate[] =
    [
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        assignedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        revokedAt: null,
        isActive: true,
      },
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        assignedAt: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        revokedAt: null,
        isActive: true,
      },
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        assignedAt: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
        revokedAt: new Date(now.getTime()).toISOString(),
        isActive: false,
      },
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        assignedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        revokedAt: null,
        isActive: true,
      },
    ];

  for (const body of assignmentInputs) {
    const created: ICommunityPlatformCommunityModeratorAssignment =
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
        connection,
        {
          communityIdentifier,
          body,
        },
      );
    typia.assert(created);
    assignments.push(created);
  }

  // Separate active and inactive assignment IDs for later reasoning
  const activeAssignments = assignments.filter((a) => a.isActive);
  const inactiveAssignments = assignments.filter((a) => !a.isActive);

  // 8. Page 1: activeOnly=true, pageSize=2, sorted by assignedAt desc
  const page1RequestBody = {
    page: 1,
    pageSize: 2,
    activeOnly: true,
    sortBy: "assignedAt",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IRequest;

  const page1: IPageICommunityPlatformCommunityModeratorAssignment.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.index(
      connection,
      {
        communityIdentifier,
        body: page1RequestBody,
      },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  TestValidator.equals("page1 pagination current is 1", pagination1.current, 1);
  TestValidator.equals("page1 pagination limit is 2", pagination1.limit, 2);
  TestValidator.predicate("page1 data length <= 2", page1.data.length <= 2);

  // All items in page1 should be active
  for (const item of page1.data) {
    TestValidator.predicate(
      "page1 item is_active is true",
      item.is_active === true,
    );
  }

  // Verify assigned_at sorted desc in page1
  for (let i = 1; i < page1.data.length; i++) {
    const prev = page1.data[i - 1].assigned_at;
    const curr = page1.data[i].assigned_at;
    TestValidator.predicate(
      `page1 assigned_at[${i - 1}] >= assigned_at[${i}]`,
      new Date(prev).getTime() >= new Date(curr).getTime(),
    );
  }

  const page1Ids = page1.data.map((d) => d.id);

  // 9. Page 2: same filters, page=2
  const page2RequestBody = {
    page: 2,
    pageSize: 2,
    activeOnly: true,
    sortBy: "assignedAt",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IRequest;

  const page2: IPageICommunityPlatformCommunityModeratorAssignment.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.index(
      connection,
      {
        communityIdentifier,
        body: page2RequestBody,
      },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  TestValidator.equals("page2 pagination current is 2", pagination2.current, 2);
  TestValidator.equals("page2 pagination limit is 2", pagination2.limit, 2);
  TestValidator.predicate("page2 data length <= 2", page2.data.length <= 2);

  for (const item of page2.data) {
    TestValidator.predicate(
      "page2 item is_active is true",
      item.is_active === true,
    );
  }

  // No duplicate IDs between page1 and page2 when we expect > 2 active assignments
  if (activeAssignments.length > 2) {
    const page2Ids = page2.data.map((d) => d.id);
    for (const id of page2Ids) {
      TestValidator.predicate(
        "no overlap between page1 and page2 ids",
        page1Ids.includes(id) === false,
      );
    }
  }

  // 10. Optional: activeOnly=false to allow inactive assignments
  if (inactiveAssignments.length > 0) {
    const mixedRequestBody = {
      page: 1,
      pageSize: 10,
      activeOnly: false,
      sortBy: "assignedAt",
      sortDirection: "desc",
    } satisfies ICommunityPlatformCommunityModeratorAssignment.IRequest;

    const mixedPage: IPageICommunityPlatformCommunityModeratorAssignment.ISummary =
      await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.index(
        connection,
        {
          communityIdentifier,
          body: mixedRequestBody,
        },
      );
    typia.assert(mixedPage);

    const hasInactive = mixedPage.data.some((d) => d.is_active === false);
    TestValidator.predicate(
      "mixed page includes at least one inactive assignment",
      hasInactive === true,
    );
  }
}
