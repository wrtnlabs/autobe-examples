import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipRequest";

/**
 * Verify moderator membership request listing pagination and sorting.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a community visibility level.
 * 3. Member user joins and logs in.
 * 4. Member user creates a community using the created visibility level.
 * 5. Community moderator joins and logs in.
 * 6. Member user creates more than one page worth of community membership requests
 *    (e.g., 15) for that community.
 * 7. Community moderator lists membership requests with page=1, limit=10, ordering
 *    by requested_at desc.
 * 8. Community moderator lists membership requests again with page=2, same
 *    ordering.
 *
 * Validations:
 *
 * - Both listing calls return typed pagination summary responses.
 * - First page has at most 10 items, second page has remaining items.
 * - No duplicated membership request ID between page 1 and page 2.
 * - Pagination metadata matches the total number of created membership requests.
 * - Each page is individually sorted by requested_at/created_at in descending
 *   order.
 */
export async function test_api_moderator_membership_requests_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins
  const memberUsername = `member_${RandomGenerator.alphaNumeric(6)}`;
  const memberEmail = `${memberUsername}@example.com` as string &
    tags.Format<"email">;
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Ensure member login sets token explicitly
  const memberLoginBody = {
    identifier: memberEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/login",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 5. Community moderator joins
  const moderatorUsername = `moderator_${RandomGenerator.alphaNumeric(6)}`;
  const moderatorEmail = `${moderatorUsername}@example.com` as string &
    tags.Format<"email">;

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://platform.example.com/moderator/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/moderator/login",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 6. Member user creates multiple membership requests (switch back to member)
  const memberReLoginBody = {
    identifier: memberEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/login",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberReLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReLoginBody,
    });
  typia.assert(memberReLogin);

  const totalRequests = 15;
  const createdRequestIds: string[] = [];

  for (let i = 0; i < totalRequests; i++) {
    const createBody = {
      questionKey: `q_${i}`,
      answerText: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

    const request =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier,
          body: createBody,
        },
      );
    typia.assert(request);
    createdRequestIds.push(request.id);
  }

  // 7. Switch to moderator context before listing
  const moderatorReLoginBody = {
    identifier: moderatorEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/moderator/login",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorReLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorReLoginBody,
    });
  typia.assert(moderatorReLogin);

  // 8. Moderator lists membership requests page 1
  const page = 1;
  const limit = 10;
  const requestFilterPage1 = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page,
    limit,
    order_by: "requested_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page1: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier,
        body: requestFilterPage1,
      },
    );
  typia.assert(page1);

  const page1Ids = page1.data.map((s) => s.id);

  TestValidator.predicate(
    "first page contains at most limit items",
    page1.data.length <= limit,
  );

  // Check descending order by created_at (aligned with requested_at semantics)
  const page1CreatedAt = page1.data.map((s) => s.created_at);
  const page1Sorted = [...page1CreatedAt].sort((a, b) =>
    a > b ? -1 : a < b ? 1 : 0,
  );
  TestValidator.equals(
    "page1 is sorted by created_at descending",
    page1CreatedAt,
    page1Sorted,
  );

  // 9. Moderator lists membership requests page 2
  const page2Filter = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 2,
    limit,
    order_by: "requested_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page2: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier,
        body: page2Filter,
      },
    );
  typia.assert(page2);

  const page2Ids = page2.data.map((s) => s.id);

  const totalListed = page1Ids.length + page2Ids.length;
  const uniqueListedIds = Array.from(new Set([...page1Ids, ...page2Ids]));

  // No duplication across page1 and page2
  TestValidator.equals(
    "no duplicate IDs across page1 and page2",
    uniqueListedIds.length,
    totalListed,
  );

  // Pagination metadata consistency
  const pagination: IPage.IPagination = page1.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination.limit matches requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.equals(
    "pagination.current is first page",
    pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination.records equals total membership requests",
    pagination.records,
    totalRequests,
  );

  const expectedPages = Math.ceil(totalRequests / limit);
  TestValidator.equals(
    "pagination.pages matches ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  // Page2 size should be totalRequests - firstPageCount
  const expectedPage2Size = Math.max(totalRequests - page1Ids.length, 0);
  TestValidator.equals(
    "second page contains remaining items",
    page2.data.length,
    expectedPage2Size,
  );

  // Check descending order for page2 created_at
  const page2CreatedAt = page2.data.map((s) => s.created_at);
  const page2Sorted = [...page2CreatedAt].sort((a, b) =>
    a > b ? -1 : a < b ? 1 : 0,
  );
  TestValidator.equals(
    "page2 is sorted by created_at descending",
    page2CreatedAt,
    page2Sorted,
  );
}
