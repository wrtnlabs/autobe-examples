import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Validate that an authenticated user can retrieve a paginated and filterable
 * list of community memberships.
 *
 * 1. Register and authenticate a new community-platform user.
 * 2. As the authenticated user, create a new community (user will be the initial
 *    member).
 * 3. Patch to /communityPlatform/user/communities/{communityId}/memberships with
 *    basic pagination.
 * 4. Validate the response type, member content, and that user is present in the
 *    list.
 * 5. Test search by display name (full and substring), search by email substring,
 *    sort_by (join_date, alphabetical), and sort_order (asc/desc).
 * 6. Validate pagination limit/page. (limit=1, page=1 returns just first, page=2
 *    is empty)
 * 7. Test unauthenticated access (should fail).
 */
export async function test_api_community_membership_pagination_and_filtering_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const joinUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://testdomain.com/register",
    referrer: "https://testdomain.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinUserBody,
  });
  typia.assert(user);

  // 2. Create a new community (user must be authenticated)
  const createCommunityBody = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 2,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);

  // 3. Attempt listing memberships with default params
  const basicQuery = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const membershipsPage =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: basicQuery },
    );
  typia.assert(membershipsPage);
  TestValidator.predicate(
    "must contain the creator user as a member",
    membershipsPage.data.some((m) => m.user.id === user.id),
  );
  TestValidator.equals(
    "pagination shows one record",
    membershipsPage.pagination.records,
    1,
  );

  // 4. Search by full display name
  const searchByName = {
    ...basicQuery,
    search: joinUserBody.display_name,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const byName =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: searchByName },
    );
  typia.assert(byName);
  TestValidator.predicate(
    "search by exact display name returns the user",
    byName.data.some((m) => m.user.display_name === joinUserBody.display_name),
  );

  // 5. Search by partial display name
  const partial = joinUserBody.display_name.substring(
    0,
    Math.max(1, Math.floor(joinUserBody.display_name.length / 2)),
  );
  const searchByPartialName = {
    ...basicQuery,
    search: partial,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const byPartial =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: searchByPartialName },
    );
  typia.assert(byPartial);
  TestValidator.predicate(
    "search by partial display name returns the user",
    byPartial.data.some((m) => m.user.id === user.id),
  );

  // 6. Search by email substring (actual ISummary user has only id/display_name, so check id only)
  const emailPartial = joinUserBody.email.substring(
    0,
    joinUserBody.email.indexOf("@"),
  );
  const searchByEmail = {
    ...basicQuery,
    search: emailPartial,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const byEmail =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: searchByEmail },
    );
  typia.assert(byEmail);
  TestValidator.predicate(
    "search by email substring returns the user (by id)",
    byEmail.data.some((m) => m.user.id === user.id),
  );

  // 7. Test sort_by: alphabetical, sort_order: asc
  const sortAlphaAsc = {
    ...basicQuery,
    sort_by: "alphabetical",
    sort_order: "asc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const resultAlphaAsc =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: sortAlphaAsc },
    );
  typia.assert(resultAlphaAsc);
  TestValidator.equals(
    "single record for alphabetical asc",
    resultAlphaAsc.pagination.records,
    1,
  );

  // 8. Test sort_by: join_date, sort_order: desc
  const sortJoinDesc = {
    ...basicQuery,
    sort_by: "join_date",
    sort_order: "desc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const resultJoinDesc =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: sortJoinDesc },
    );
  typia.assert(resultJoinDesc);
  TestValidator.equals(
    "single record for join_date desc",
    resultJoinDesc.pagination.records,
    1,
  );

  // 9. Pagination with limit=1 (should list user on page 1, page 2 is empty or out-of-range)
  const limit1Page1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const singleResult =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: limit1Page1 },
    );
  typia.assert(singleResult);
  TestValidator.predicate(
    "limit=1 includes user",
    singleResult.data.some((m) => m.user.id === user.id),
  );
  const limit1Page2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const emptyPage2 =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      { communityId: community.id, body: limit1Page2 },
    );
  typia.assert(emptyPage2);
  TestValidator.equals("limit=1 page=2 is empty", emptyPage2.data.length, 0);

  // 10. Attempt to get memberships with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to membership list is denied",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.index(
        unauthConn,
        { communityId: community.id, body: basicQuery },
      );
    },
  );
}
