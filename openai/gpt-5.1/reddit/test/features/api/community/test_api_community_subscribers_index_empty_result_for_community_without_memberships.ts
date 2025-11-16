import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Validate that requesting subscribers for a community with no memberships
 * returns an empty data array with correct pagination metadata.
 *
 * Business flow:
 *
 * 1. Register a new memberUser account via /auth/memberUser/join to obtain an
 *    authenticated context.
 * 2. Create a new community via /communityPlatform/memberUser/communities using
 *    that authenticated memberUser; the new community naturally has no
 *    memberships yet.
 * 3. Call PATCH /communityPlatform/communities/{communityId}/subscribers with a
 *    basic ICommunityPlatformCommunityMembership.IRequest body specifying
 *    page=1 and pageSize=10, without any additional filters.
 * 4. Assert that the response is a valid
 *    IPageICommunityPlatformCommunityMembership.ISummary object where:
 *
 *    - Data is an empty array (no subscribers).
 *    - Pagination.records is 0.
 *    - Pagination.pages is a non-negative integer consistent with an empty result
 *         set (0 or 1 depending on implementation strategy).
 *    - Pagination.current and pagination.limit reflect the requested page and
 *         pageSize (1 and 10 respectively).
 * 5. Implicitly confirm that the endpoint does not error when no memberships exist
 *    for the specified communityId.
 */
export async function test_api_community_subscribers_index_empty_result_for_community_without_memberships(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser (authentication prerequisite)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMemberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMemberUser);

  // 2. Create a new community owned by this memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 12,
    }),
    description: null,
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

  // 3. Request subscribers for the newly created community with basic pagination
  const membershipRequestBody = {
    page: 1,
    pageSize: 10,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const page: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      connection,
      {
        communityId: community.id,
        body: membershipRequestBody,
      },
    );
  typia.assert(page);

  // 4. Validate empty result set and pagination metadata
  TestValidator.equals(
    "no subscribers should be returned for a fresh community",
    page.data.length,
    0,
  );

  TestValidator.equals(
    "no membership records should exist for a fresh community",
    page.pagination.records,
    0,
  );

  TestValidator.predicate(
    "pages should be non-negative for empty subscriber list",
    page.pagination.pages >= 0,
  );

  // When there are zero records, implementations often return pages as 0 or 1.
  TestValidator.predicate(
    "pages should be 0 or 1 when there are no records",
    page.pagination.pages === 0 || page.pagination.pages === 1,
  );

  TestValidator.equals(
    "current page should match requested page index",
    page.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match requested page size",
    page.pagination.limit,
    10,
  );
}
