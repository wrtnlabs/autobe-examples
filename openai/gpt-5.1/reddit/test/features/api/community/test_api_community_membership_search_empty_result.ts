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
 * Validate that admin membership search returns an empty page when a freshly
 * created community has no memberships (or no memberships match the provided
 * filters).
 *
 * Business goals:
 *
 * - Ensure PATCH
 *   /communityPlatform/adminUser/communities/{communitySlug}/memberships
 *   returns a well-formed IPageICommunityPlatformCommunityMembership.ISummary
 *   response even when there are zero matching records.
 * - Confirm that pagination metadata is consistent with an empty result (records
 *   = 0, pages and current are non-negative and logically aligned), and that
 *   data is an empty array.
 * - Exercise multi-actor flows: a memberUser creates a community, an adminUser
 *   searches that community's memberships.
 */
export async function test_api_community_membership_search_empty_result(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser (creator of the community)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a new community as the authenticated memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Use the slug for membership search
  const communitySlug: string = community.slug;

  // 3. Register an adminUser via join (also authenticates as admin)
  const adminEmail = `${RandomGenerator.alphabets(10)}@admin.example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Perform an explicit admin login to exercise the login flow
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. As the authenticated admin, search memberships of the newly created community
  // We deliberately:
  // - do not create any memberships
  // - use a filter that is guaranteed not to match any membership
  const searchBody = {
    page: 1,
    pageSize: 10,
    // Use a random UUID-like string as memberUserId filter to ensure no matches
    memberUserId: typia.random<string & tags.Format<"uuid">>(),
    // Use role/status values that are plausible but will not match any
    // (since there are no memberships at all).
    role: "member",
    status: "active",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const page: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.adminUser.communities.memberships.index(
      connection,
      {
        communitySlug,
        body: searchBody,
      },
    );
  typia.assert(page);

  // 6. Validate business expectations for empty result
  // a) data should be an empty array
  TestValidator.equals(
    "membership search data should be empty when no memberships exist",
    page.data.length,
    0,
  );

  // b) pagination.records should be 0
  TestValidator.equals(
    "membership search pagination.records should be 0 when no memberships match",
    page.pagination.records,
    0,
  );

  // c) pagination.current, pagination.limit, pagination.pages must be non-negative
  TestValidator.predicate(
    "pagination.current should be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    page.pagination.pages >= 0,
  );

  // d) When there are no records, pages should be either 0 or 1 depending on backend policy
  TestValidator.predicate(
    "pagination.pages should be 0 or 1 when there are no records",
    page.pagination.pages === 0 || page.pagination.pages === 1,
  );

  // 7. Perform a second search with different filters (e.g., no filters)
  const secondSearchBody = {
    page: 1,
    pageSize: 5,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const secondPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.adminUser.communities.memberships.index(
      connection,
      {
        communitySlug,
        body: secondSearchBody,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second membership search data should also be empty for a community with no memberships",
    secondPage.data.length,
    0,
  );
  TestValidator.equals(
    "second membership search pagination.records should be 0",
    secondPage.pagination.records,
    0,
  );
}
