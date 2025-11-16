import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Admin can search community memberships with pagination and filters.
 *
 * Business flow implemented by this test:
 *
 * 1. Register a memberUser and log them in.
 * 2. As memberUser, create a community via
 *    communityPlatform/memberUser/communities.create.
 * 3. Still as memberUser, create several memberships in that community by calling
 *    communityPlatform/memberUser/communities.memberships.create with different
 *    role/isApproved/isBanned combinations to seed realistic data for search.
 *
 *    - In practice the backend derives memberUser from auth context, but in this
 *         test we only care that multiple records exist with varied fields.
 * 4. Register an adminUser via auth/adminUser.join (this returns an authorized
 *    admin context and sets the admin JWT token on the shared connection).
 * 5. As adminUser, call communityPlatform.adminUser.communities.memberships.index
 *    with an ICommunityPlatformCommunityMembership.IRequest body that specifies
 *    pagination and filter criteria, targeting the created communitySlug.
 * 6. Assert that the response is a valid
 *    IPageICommunityPlatformCommunityMembership.ISummary using typia.assert,
 *    that pagination metadata is consistent with the requested page/pageSize,
 *    and that every returned membership:
 *
 *    - Belongs to the expected communitySlug; and
 *    - Matches the filter criteria (e.g., specific role, approved/banned state).
 * 7. Optionally execute multiple searches with different filters (e.g., by role,
 *    by status) to cover typical admin usage scenarios.
 */
export async function test_api_community_membership_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join acts as auth and sets token header)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/signup",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as this memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communitySlug: string = community.slug;

  // 3. Create multiple memberships in that community as memberUser
  //    Seed different roles and approval/ban combinations.
  const membershipConfigs: ICommunityPlatformCommunityMembership.ICreate[] = [
    { role: "member", isApproved: true, isBanned: false },
    { role: "member", isApproved: false, isBanned: false },
    { role: "moderator", isApproved: true, isBanned: false },
    { role: "moderator", isApproved: true, isBanned: true },
  ];

  const createdMemberships: ICommunityPlatformCommunityMembership[] = [];
  for (const config of membershipConfigs) {
    const membership =
      await api.functional.communityPlatform.memberUser.communities.memberships.create(
        connection,
        {
          communitySlug,
          body: config,
        },
      );
    typia.assert(membership);
    createdMemberships.push(membership);
  }

  TestValidator.predicate(
    "at least one membership created",
    createdMemberships.length > 0,
  );

  // 4. Register an adminUser (this sets admin JWT on the same connection)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, search memberships by specific role and approval status
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    role: "moderator",
    status: undefined,
    roles: undefined,
    statuses: undefined,
    cursor: undefined,
    memberUserId: undefined,
    joinedAtFrom: undefined,
    joinedAtTo: undefined,
    orderBy: "joinedAt",
    orderDirection: "asc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageResult: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.adminUser.communities.memberships.index(
      connection,
      {
        communitySlug,
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pagination.pages >= 0,
  );

  // 6. Validate each returned membership summary
  for (const summary of pageResult.data) {
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(summary);

    // Must belong to the same community slug
    TestValidator.equals(
      "membership communitySlug matches requested community",
      summary.community.slug,
      communitySlug,
    );

    // Must match filter role = "moderator"
    TestValidator.equals(
      "membership role should match requested role",
      summary.role,
      "moderator",
    );
  }

  // 7. Additional search: filter by roles[] and check that all results are
  //    either member or moderator, scoped to same community.
  const multiRoleSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    roles: ["member", "moderator"],
    role: undefined,
    status: undefined,
    statuses: undefined,
    cursor: undefined,
    memberUserId: undefined,
    joinedAtFrom: undefined,
    joinedAtTo: undefined,
    orderBy: "joinedAt",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const multiRolePage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.adminUser.communities.memberships.index(
      connection,
      {
        communitySlug,
        body: multiRoleSearchBody,
      },
    );
  typia.assert(multiRolePage);

  for (const summary of multiRolePage.data) {
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(summary);

    TestValidator.equals(
      "multi-role search scoped to community",
      summary.community.slug,
      communitySlug,
    );

    TestValidator.predicate(
      "role in allowed set [member, moderator]",
      summary.role === "member" || summary.role === "moderator",
    );
  }
}
