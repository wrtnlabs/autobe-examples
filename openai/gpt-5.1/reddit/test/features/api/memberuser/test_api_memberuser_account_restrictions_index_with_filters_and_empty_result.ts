import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

/**
 * Validate that memberUser account restriction listing returns an empty page
 * when filters match no records.
 *
 * Business context: Administrative tooling needs to query account restriction
 * histories for specific member users. In many cases, admins or automation will
 * issue highly selective queries (e.g., very narrow date windows or rare reason
 * categories) that return no matching restriction episodes. The endpoint must
 * still succeed and return a correctly shaped pagination object with an empty
 * data array so that UIs can render an empty list gracefully.
 *
 * This test verifies that behavior for the memberUser-focused restriction
 * listing endpoint that is scoped by username.
 *
 * High-level steps:
 *
 * 1. Register an adminUser and obtain an authenticated admin context.
 * 2. Register a memberUser and obtain an authenticated member context with a
 *    stable username.
 * 3. As the memberUser, create a community to exercise the member domain (and
 *    indirectly validate that the member account is usable across the community
 *    platform) – though the community itself is not directly used in the
 *    restriction listing.
 * 4. Switch authentication back to the adminUser.
 * 5. Call the restriction listing endpoint for the memberUser’s username with an
 *    ICommunityPlatformAccountRestriction.IRequest body that sets:
 *
 *    - Subject_username to the member’s username,
 *    - Highly selective filters (e.g., a reason_category value and date ranges) that
 *         are extremely unlikely to match any restriction episodes in a typical
 *         test database or simulator random data,
 *    - Explicit page and limit values.
 * 6. Assert that the endpoint responds successfully, that the response structure
 *    is a valid IPageICommunityPlatformAccountRestriction.ISummary, and that:
 *
 *    - Pagination.records is 0,
 *    - Pagination.pages is 0,
 *    - Data is an empty array,
 *    - Pagination.limit reflects the requested limit,
 *    - Pagination.current is the requested page (or at minimum non-negative and
 *         consistent with an empty result set).
 * 7. Confirm that no error is thrown and that this empty-result path is handled as
 *    a normal, successful scenario.
 */
export async function test_api_memberuser_account_restrictions_index_with_filters_and_empty_result(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to obtain admin credentials and token
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminUsername: string = adminAuthorized.username;

  // 2. Register a memberUser (join) with distinct username/email to be the subject of restriction listing
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUsername: string = memberAuthorized.username;

  // 3. As the memberUser, create a community to ensure the member account is active in the community platform domain
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 4. Switch authentication back to the adminUser via login
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Prepare a request body for account restriction index with filters that should match no records
  const now: Date = new Date();
  const earlier: Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const restrictionRequestBody = {
    page,
    limit,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: memberUsername,
    subject_type: "memberUser",
    restriction_type: "nonexistent_type_code",
    is_active: true,
    effective_from_gte: earlier.toISOString(),
    effective_from_lte: earlier.toISOString(),
    effective_until_gte: now.toISOString(),
    effective_until_lte: now.toISOString(),
    reason_category: "extremely_rare_reason_category",
    created_at_gte: earlier.toISOString(),
    created_at_lte: earlier.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  // 6. Call the restriction listing endpoint for the memberUser with the above filters
  const pageResult: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
      connection,
      {
        username: memberUsername,
        body: restrictionRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  // 7. Validate that the response is an empty page with consistent pagination metadata
  TestValidator.equals(
    "restriction listing data array should be empty when filters match no records",
    pageResult.data,
    [],
  );

  TestValidator.equals(
    "restriction listing pagination.records should be zero when no results",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "restriction listing pagination.pages should be zero when no results",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "restriction listing pagination.limit should respect requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.equals(
    "restriction listing pagination.current should reflect requested page or be consistent",
    pagination.current,
    page,
  );

  await TestValidator.predicate(
    "restriction listing request should not throw and should be handled gracefully",
    true,
  );
}
