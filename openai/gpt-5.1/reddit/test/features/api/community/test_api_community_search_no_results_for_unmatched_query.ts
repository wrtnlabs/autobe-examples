import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate that community search returns no results for an unmatched query
 * while preserving pagination schema.
 *
 * Business goal:
 *
 * - Ensure that PATCH /communityPlatform/communities gracefully handles search
 *   strings that do not match any community, by returning an empty data array
 *   and a consistent pagination object instead of errors.
 *
 * Steps:
 *
 * 1. Join as a member user using /auth/memberUser/join, which also prepares
 *    authenticated context.
 * 2. Create at least one community via /communityPlatform/memberUser/communities
 *    so the table is non-empty.
 * 3. Build an ICommunityPlatformCommunity.IRequest with a highly specific random
 *    search token plus normal pagination parameters (page/limit).
 * 4. Call api.functional.communityPlatform.communities.index with that request.
 * 5. Assert that:
 *
 *    - The response satisfies IPageICommunityPlatformCommunity.ISummary via
 *         typia.assert.
 *    - Data is an empty array (no communities match the search term).
 *    - Pagination metadata is consistent with zero results (records === 0, pages ===
 *         0, current === requested page, limit === requested limit).
 * 6. This confirms that clients can safely treat an empty result set without extra
 *    error handling.
 */
export async function test_api_community_search_no_results_for_unmatched_query(
  connection: api.IConnection,
) {
  // 1. Join as a member user to obtain authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create at least one community so that the table is non-empty.
  const createCommunityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
        body: createCommunityBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Build a highly specific, non-matching search term.
  const unmatchedSearchToken = `unmatched-${typia.random<
    string & tags.Format<"uuid">
  >()}-${RandomGenerator.alphaNumeric(16)}`;

  const requestBody = {
    page: 1,
    limit: 10,
    search: unmatchedSearchToken,
  } satisfies ICommunityPlatformCommunity.IRequest;

  // 4. Call the search endpoint with the unmatched search query.
  const page: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 5. Assert business logic: no results, valid pagination.
  const pagination = page.pagination;

  TestValidator.equals(
    "search with unmatched query returns empty data array",
    page.data.length,
    0,
  );

  TestValidator.equals(
    "pagination.current matches requested page when no results",
    pagination.current,
    requestBody.page,
  );

  TestValidator.equals(
    "pagination.limit matches requested limit when no results",
    pagination.limit,
    requestBody.limit,
  );

  TestValidator.equals(
    "pagination.records is zero when no communities match",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination.pages is zero when no communities match",
    pagination.pages,
    0,
  );
}
