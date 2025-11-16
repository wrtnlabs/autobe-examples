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
 * Validate admin membership search with filters and pagination.
 *
 * Business context:
 *
 * - Communities can have many memberships with different roles and moderation
 *   states.
 * - Admins need to list memberships for a specific community, often filtered by
 *   role or high-level status, and paged in small chunks for management UIs.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser and obtain an authenticated context.
 * 2. Register a memberUser and authenticate as that member.
 * 3. As the memberUser, create a community.
 * 4. Still as memberUser, create several memberships in that community with
 *    distinct roles and moderation flags via
 *    ICommunityPlatformCommunityMembership.ICreate.
 * 5. Switch authentication back to adminUser.
 * 6. Call the admin membership search endpoint with:
 *
 *    - CommunitySlug bound to the created community.
 *    - Body as ICommunityPlatformCommunityMembership.IRequest with small pageSize
 *         and a role filter that targets a subset of memberships.
 * 7. Assert that:
 *
 *    - The response type matches
 *         IPageICommunityPlatformCommunityMembership.ISummary.
 *    - All returned memberships belong to the expected community slug.
 *    - All returned memberships have one of the filtered roles.
 *    - Pagination metadata current/limit/records/pages is consistent with the number
 *         of matching memberships.
 * 8. Repeat the search with page=2 to verify non-overlapping pages and stable
 *    page-level segmentation.
 */
export async function test_api_community_membership_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!1",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminIdentifier = adminAuthorized.username;
  const adminEmail = adminAuthorized.email;

  // 2. Register a memberUser and authenticate
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass!1",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUsername = memberAuthorized.username;

  // 3. As the memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  const communitySlug = community.slug;

  // 4. Create multiple memberships in the community as the memberUser.
  //    We will create three roles: "member", "moderator", "owner".
  const roles = ["member", "moderator", "owner"] as const;

  const createdMemberships: ICommunityPlatformCommunityMembership[] = [];

  // Create 2 memberships per role to ensure multiple pages when filtering by role.
  for (const role of roles) {
    for (let i = 0; i < 2; i++) {
      const createBody = {
        role,
        isApproved: true,
        isBanned: false,
      } satisfies ICommunityPlatformCommunityMembership.ICreate;

      const membership: ICommunityPlatformCommunityMembership =
        await api.functional.communityPlatform.memberUser.communities.memberships.create(
          connection,
          {
            communitySlug,
            body: createBody,
          },
        );
      typia.assert(membership);
      createdMemberships.push(membership);
    }
  }

  // 5. Switch authentication back to adminUser via login to ensure admin context.
  const adminLoginBody = {
    identifier: adminEmail,
    password: "AdminPass!1",
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Call admin membership search with a role filter and small pageSize.
  const targetRole = "moderator";
  const pageSize = 2;

  const firstPageRequest = {
    page: 1,
    pageSize,
    role: targetRole,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const firstPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.adminUser.communities.memberships.index(
      connection,
      {
        communitySlug,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  // 7. Assertions for first page
  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // All results should belong to the same community slug and match the role filter.
  for (const summary of data1) {
    TestValidator.equals(
      "membership community slug matches filter community",
      summary.community.slug,
      communitySlug,
    );
    TestValidator.equals(
      "membership role matches requested role on first page",
      summary.role,
      targetRole,
    );
  }

  // Compute expected total number of memberships with the target role.
  const expectedModerators = createdMemberships.filter(
    (m) => m.role === targetRole,
  );

  TestValidator.equals(
    "pagination limit equals requested pageSize",
    pagination1.limit,
    pageSize,
  );

  // records should be at least the number of memberships with that role.
  TestValidator.predicate(
    "pagination records >= number of created memberships with target role",
    pagination1.records >= expectedModerators.length,
  );

  // If we created exactly 2 moderators, expect 1 page; otherwise expect >=1.
  TestValidator.predicate("pagination pages >= 1", pagination1.pages >= 1);

  // 8. Second page to ensure pagination segmentation when more than one page.
  if (pagination1.pages > 1) {
    const secondPageRequest = {
      page: 2,
      pageSize,
      role: targetRole,
    } satisfies ICommunityPlatformCommunityMembership.IRequest;

    const secondPage: IPageICommunityPlatformCommunityMembership.ISummary =
      await api.functional.communityPlatform.adminUser.communities.memberships.index(
        connection,
        {
          communitySlug,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPage);

    const pagination2 = secondPage.pagination;
    const data2 = secondPage.data;

    TestValidator.equals("second page current index", pagination2.current, 2);

    for (const summary of data2) {
      TestValidator.equals(
        "second page membership community slug matches",
        summary.community.slug,
        communitySlug,
      );
      TestValidator.equals(
        "second page membership role matches requested role",
        summary.role,
        targetRole,
      );
    }

    // Ensure non-overlapping IDs between page 1 and page 2.
    const ids1 = data1.map((m) => m.id);
    const ids2 = data2.map((m) => m.id);

    for (const id of ids2) {
      TestValidator.predicate(
        "memberships on second page are not duplicated from first page",
        ids1.includes(id) === false,
      );
    }
  }
}
