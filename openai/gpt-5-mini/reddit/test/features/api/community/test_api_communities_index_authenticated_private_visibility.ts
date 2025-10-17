import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalCommunity";

export async function test_api_communities_index_authenticated_private_visibility(
  connection: api.IConnection,
) {
  /**
   * Test: authenticated member can see private communities they
   * created/subscribed to.
   *
   * Steps:
   *
   * 1. Register a test member (POST /auth/member/join)
   * 2. Create a private community as that member (POST
   *    /communityPortal/member/communities)
   * 3. Subscribe the member to the community (POST
   *    /communityPortal/member/communities/{communityId}/subscriptions)
   * 4. Call PATCH /communityPortal/communities as the authenticated member to list
   *    communities
   * 5. Assert that the created private community appears in the listing and
   *    pagination metadata is present
   */

  // 1) Register a new member
  const username = RandomGenerator.alphaNumeric(8);
  const joinBody = {
    username,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create a private community as the authenticated member
  const createBody = {
    name: RandomGenerator.name(3),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: true,
    visibility: "private",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: createBody,
    });
  typia.assert(community);

  // 3) Subscribe the member to the private community
  const subscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
        } satisfies ICommunityPortalSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4) Call the listing endpoint (PATCH /communityPortal/communities) as the authenticated member
  const requestBody = {
    is_private: true,
    slug: community.slug,
    page: 1,
    limit: 10,
  } satisfies ICommunityPortalCommunity.IRequest;

  const page: IPageICommunityPortalCommunity.ISummary =
    await api.functional.communityPortal.communities.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  // 5) Assertions: private community is present in the returned data and pagination metadata exists
  TestValidator.predicate(
    "private community should appear in member's listing",
    page.data.some((c) => c.id === community.id),
  );

  TestValidator.equals(
    "pagination current page should match request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page.pagination.limit,
    10,
  );
}
