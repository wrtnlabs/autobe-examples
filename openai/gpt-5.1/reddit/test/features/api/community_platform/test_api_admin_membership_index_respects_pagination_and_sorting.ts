import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

export async function test_api_admin_membership_index_respects_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register member user A
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Create a visibility level as platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const visibilityCode = RandomGenerator.alphabets(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${visibilityCode}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Authenticate as member user A (login) to create communities and membership requests
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create more than one page of communities and membership requests
  const totalMemberships = 15;

  for (let i = 0; i < totalMemberships; i++) {
    const communityBody = {
      identifier: `${RandomGenerator.alphabets(6)}_${i}`,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      visibilityLevelCode: visibilityCode,
      isNsfw: false,
      primaryTagIds: [],
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: communityBody,
        },
      );
    typia.assert(community);

    const membershipRequestBody = {
      questionKey: "why_join",
      answerText: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

    const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: membershipRequestBody,
        },
      );
    typia.assert(membershipRequest);
  }

  // 5. Switch back to platform admin via login (ensuring admin context)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 6. Call index for page 1
  const limit = 10;
  const page1Body = {
    is_active: undefined,
    joined_from: undefined,
    joined_to: undefined,
    ended_from: undefined,
    ended_to: undefined,
    include_deleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const page1: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberUserId,
        body: page1Body,
      },
    );
  typia.assert(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  TestValidator.equals(
    "page1 current page should be 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 limit should equal requested limit",
    page1Pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page1 should contain exactly 10 memberships",
    page1Data.length,
    limit,
  );

  // Check descending joined_at ordering on page1
  for (let i = 1; i < page1Data.length; i++) {
    const prev = page1Data[i - 1];
    const curr = page1Data[i];
    const prevDate = new Date(prev.joined_at);
    const currDate = new Date(curr.joined_at);
    TestValidator.predicate(
      `page1 joined_at should be non-increasing at index ${i}`,
      prevDate.getTime() >= currDate.getTime(),
    );
  }

  // 7. Call index for page 2
  const page2Body = {
    is_active: undefined,
    joined_from: undefined,
    joined_to: undefined,
    ended_from: undefined,
    ended_to: undefined,
    include_deleted: false,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const page2: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberUserId,
        body: page2Body,
      },
    );
  typia.assert(page2);

  const page2Pagination = page2.pagination;
  const page2Data = page2.data;

  TestValidator.equals(
    "page2 current page should be 2",
    page2Pagination.current,
    2,
  );

  const expectedSecondPageCount = totalMemberships - limit;
  TestValidator.equals(
    "page2 should contain remaining memberships",
    page2Data.length,
    expectedSecondPageCount,
  );

  // Check descending joined_at ordering on page2
  for (let i = 1; i < page2Data.length; i++) {
    const prev = page2Data[i - 1];
    const curr = page2Data[i];
    const prevDate = new Date(prev.joined_at);
    const currDate = new Date(curr.joined_at);
    TestValidator.predicate(
      `page2 joined_at should be non-increasing at index ${i}`,
      prevDate.getTime() >= currDate.getTime(),
    );
  }

  // 8. Verify no overlap between page1 and page2 membership IDs
  const page1Ids = page1Data.map((m) => m.id);
  const page2Ids = page2Data.map((m) => m.id);

  for (const id of page1Ids) {
    TestValidator.predicate(
      "no overlap between page1 and page2 ids",
      page2Ids.includes(id) === false,
    );
  }

  // 9. Verify pagination metadata matches totalMemberships
  const expectedPages = Math.ceil(totalMemberships / limit);

  TestValidator.equals(
    "pagination.records should equal totalMemberships on page1",
    page1Pagination.records,
    totalMemberships,
  );
  TestValidator.equals(
    "pagination.pages should equal expected pages on page1",
    page1Pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "pagination.records should equal totalMemberships on page2",
    page2Pagination.records,
    totalMemberships,
  );
  TestValidator.equals(
    "pagination.pages should equal expected pages on page2",
    page2Pagination.pages,
    expectedPages,
  );
}
