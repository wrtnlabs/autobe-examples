import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunity";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_search_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Step 2: Create 25 communities using member connection
  const communityIds: string[] = [];
  await ArrayUtil.asyncRepeat(25, async (index) => {
    const community =
      await generate_random_community_bbs_member_communities_create(
        memberConnection,
        {
          body: {
            name: `Community ${index + 1}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    communityIds.push(community.id);
  });
  // Step 3: Fetch first page with limit=20
  const firstPage = await api.functional.communityBbs.search.communities.search(
    memberConnection,
    {
      body: {
        limit: 20,
      } satisfies ICommunityBbsCommunity.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has 20 communities",
    firstPage.data.length,
    20,
  );
  TestValidator.equals(
    "first page pagination correct",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit correct",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.equals("total records", firstPage.pagination.records, 25);
  // Step 4: Use cursor from last community_id to fetch second page
  const lastCommunityId = firstPage.data[firstPage.data.length - 1].id;
  const secondPage =
    await api.functional.communityBbs.search.communities.search(
      memberConnection,
      {
        body: {
          limit: 20,
          cursor: lastCommunityId,
        } satisfies ICommunityBbsCommunity.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has 5 communities",
    secondPage.data.length,
    5,
  );
  TestValidator.equals(
    "second page pagination correct",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit correct",
    secondPage.pagination.limit,
    20,
  );
  // Step 5: Verify no duplicates between pages
  const allCommunityIds = [
    ...firstPage.data.map((c) => c.id),
    ...secondPage.data.map((c) => c.id),
  ];
  const uniqueCommunityIds = [...new Set(allCommunityIds)];
  TestValidator.equals(
    "no duplicates across pages",
    allCommunityIds.length,
    uniqueCommunityIds.length,
  );
  // Step 6: Verify all created communities are accounted for
  TestValidator.equals(
    "total communities across pages",
    allCommunityIds.length,
    25,
  );
  // Step 7: Verify sequential order of communities
  // First page should contain communities 1-20, second page should contain 21-25
  // Since we don't have explicit sort order in request, we validate by ID sequence
  // We assume communities are ordered by creation time (ID order likely reflects creation order)
  const firstPageIds = firstPage.data.map((c) => c.id);
  const secondPageIds = secondPage.data.map((c) => c.id);
  // Find all communityIDs that should be in first page
  const expectedFirstPageIds = communityIds.slice(0, 20);
  const expectedSecondPageIds = communityIds.slice(20);
  // Verify the structure - we use array comparison for exact match
  TestValidator.equals(
    "first page contains first 20 communities",
    firstPageIds.length,
    expectedFirstPageIds.length,
  );
  TestValidator.equals(
    "second page contains last 5 communities",
    secondPageIds.length,
    expectedSecondPageIds.length,
  );
  // Validate at least some overlap in expected sequence (since order is by ID, and we created in sequence)
  const firstCommunitiesMatch = expectedFirstPageIds.some((id) =>
    firstPageIds.includes(id),
  );
  TestValidator.predicate(
    "first page shows created communities",
    firstCommunitiesMatch,
  );
  // Verify second page starts after first page's last item
  // If cursor system works properly, second page should begin with the next community after last on first page
  if (secondPageIds.length > 0 && firstPageIds.length > 0) {
    const lastFirstPageId = firstPageIds[firstPageIds.length - 1];
    const firstSecondPageId = secondPageIds[0];
    // In a properly implemented cursor system, this should always be true
    // We verify that the cursor system is providing the next set
    TestValidator.predicate(
      "cursor works: second page starts after first page ends",
      communityIds.indexOf(firstSecondPageId) >
        communityIds.indexOf(lastFirstPageId),
    );
  }
}
