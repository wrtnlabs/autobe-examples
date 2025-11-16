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
 * List subscribers of a public community with filtering and pagination as an
 * anonymous caller.
 *
 * Business purpose
 *
 * - Ensure that for a _public_ community, the subscribers index endpoint is
 *   accessible without authentication and returns a typed, paginated list of
 *   membership summaries.
 * - Verify that filter, pagination and ordering parameters in
 *   ICommunityPlatformCommunityMembership.IRequest are honored at least
 *   structurally.
 *
 * Steps
 *
 * 1. Register a memberUser using the auth join endpoint, obtaining an authorized
 *    member context.
 * 2. Using that memberUser context, create a public, active community with posting
 *    enabled (text/link/image) via the memberUser communities.create endpoint.
 * 3. Build an unauthenticated connection by cloning the incoming connection but
 *    overriding headers with an empty object so that no Authorization is sent.
 * 4. Call the community subscribers index endpoint as an anonymous caller with:
 *
 *    - CommunityId: ID of the created community
 *    - Body: ICommunityPlatformCommunityMembership.IRequest including
 *
 *         - Role and status filters (arbitrary strings, e.g. "member" / "active")
 *         - Page, pageSize
 *         - OrderBy = "joinedAt", orderDirection = "desc".
 * 5. Assert that the returned value is a valid page of membership summaries and
 *    that pagination metadata is self-consistent.
 * 6. For every membership summary row, verify that:
 *
 *    - Community.id matches the created community id
 *    - Community.slug and name match the created community
 *    - MemberUser summary includes a non-empty id and username
 *    - Role field is a string and when a role filter is specified, it matches the
 *         requested role
 * 7. If there is more than one record, verify that joinedAt is sorted in
 *    descending order.
 */
export async function test_api_community_subscribers_index_public_community(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (creator of the community)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const creator: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(creator);

  // 2. Create a public, active community as this memberUser
  const communityBody = {
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Build an unauthenticated connection (no Authorization header)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call subscribers index as anonymous caller with filter + pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requestBody = {
    page,
    pageSize,
    role: "member",
    status: "active",
    orderBy: "joinedAt",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const result: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      anonymousConnection,
      {
        communityId: community.id,
        body: requestBody,
      },
    );
  typia.assert(result);

  const { pagination, data } = result;

  // 5. Pagination metadata consistency checks
  TestValidator.equals(
    "current page should equal requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "records should be >= number of returned rows",
    pagination.records >= data.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals("no records implies empty data list", data.length, 0);
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "records > 0 implies at least one page",
      pagination.pages >= 1,
    );
  }

  // 6. Validate each membership summary belongs to the created community
  for (const membership of data) {
    // Structural assertion per row
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(membership);

    TestValidator.equals(
      "membership community id should match created community",
      membership.community.id,
      community.id,
    );
    TestValidator.equals(
      "membership community slug should match created community",
      membership.community.slug,
      community.slug,
    );
    TestValidator.equals(
      "membership community name should match created community",
      membership.community.name,
      community.name,
    );

    TestValidator.predicate(
      "memberUser summary should have non-empty id",
      membership.memberUser.id.length > 0,
    );
    TestValidator.predicate(
      "memberUser summary should have non-empty username",
      membership.memberUser.username.length > 0,
    );

    TestValidator.equals(
      "membership role should match filter when role filter is set",
      membership.role,
      requestBody.role,
    );
  }

  // 7. Verify joinedAt ordering is descending (if multiple records)
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      "joinedAt must be in descending order",
      prev.joinedAt >= curr.joinedAt,
    );
  }
}
