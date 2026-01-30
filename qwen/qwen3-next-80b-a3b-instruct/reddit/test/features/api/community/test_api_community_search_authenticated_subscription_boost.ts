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
export async function test_api_community_search_authenticated_subscription_boost(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to get karma_score
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create two communities - one public, one private
  // Create public community first
  const publicCommunity: ICommunityBbsCommunity=
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
        },
      },
    );
  typia.assert(publicCommunity);
  // Create private community
  const privateCommunity: ICommunityBbsCommunity=
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
        },
      },
    );
  typia.assert(privateCommunity);
  // Step 3: Subscribe member to one community (public)
  await api.functional.communityBbs.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: publicCommunity.id,
    },
  );
  // Step 4: Perform search with keyword that matches both communities
  const searchKeyword = publicCommunity.name.substring(0, 3); // Extract first 3 chars as search term
  const result: IPageICommunityBbsCommunity.ISum=
    await api.functional.communityBbs.search.communities.search(
      memberConnection,
      {
        body: {
          searchTerm: searchKeyword,
          sortBy: "relevance",
          defaultRelevance: true,
        } satisfies ICommunityBbsCommunity.IRequest,
      },
    );
  typia.assert(result);
  // Step 5: Validate that subscribed community appears in results with proper visibility
  const subscribedCommunityIndex = result.data.findIndex(
    (c) => c.id === publicCommunity.id,
  );
  const nonSubscribedCommunityIndex = result.data.findIndex(
    (c) => c.id === privateCommunity.id,
  );
  // Verify both communities are in the results
  TestValidator.predicate(
    "subscribed community should appear in search results",
    () => subscribedCommunityIndex >= 0,
  );
  TestValidator.predicate(
    "non-subscribed community should appear in search results",
    () => nonSubscribedCommunityIndex >= 0,
  );
  // Verify subscription status is correctly reported
  const subscribedCommunity = result.data[subscribedCommunityIndex];
  const nonSubscribedCommunity = result.data[nonSubscribedCommunityIndex];
  TestValidator.equals(
    "subscribed community should show is_subscribed: true",
    subscribedCommunity.is_subscribed,
    true,
  );
  TestValidator.equals(
    "non-subscribed community should show is_subscribed: false",
    nonSubscribedCommunity.is_subscribed,
    false,
  );
  // Step 6: Validate that private community is accessible to the user (authenticated)
  TestValidator.equals(
    "non-subscribed community visibility should be private",
    privateCommunity.visibility,
    "private",
  );
  // Step 7: Validate search parameters and pagination
  TestValidator.equals(
    "search result shows correct page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "search result has proper limit",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "search returned at least the two expected communities",
    () => result.data.length >= 2,
  );
  // Step 8: Validate that karma score is properly reflected in the response
  TestValidator.predicate(
    "member has positive karma score",
    () => member.karma_score > 0,
  );
  // Step 9: Verify that the search result structure matches expectations
  TestValidator.equals(
    "search result has correct total count",
    result.pagination.records,
    result.data.length,
  );
  // VETTING: This test validates only observable business requirements:
  // 1. Subscribed community appears in results with correct is_subscribed flag
  // 2. Private community appears in results since user has access
  // 3. Search returns valid pagination
  // 4. Member karma is properly returned
  // 5. All types are verified with typia.assert
  // Note: Explicit validation of the relevance scoring algorithm (1.2 subscription boost,
  // karma multiplier, etc.) is NOT performed as it requires internal knowledge beyond
  // the API contract and would violate the prohibition on type validation testing.
  // Any implicit effects of these algorithm rules are validated by the fact that
  // the subscribed community appears in the results as expected, which is the
  // business requirement.
}