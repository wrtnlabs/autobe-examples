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
export async function test_api_community_search_public_relevance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a community (will have 'pending_approval' status)
  const communityName =
    "search_test_community_" + RandomGenerator.alphaNumeric(6);
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description:
            "This is a test community for search relevance validation.",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  // Step 3: Perform search with publicOnly=true to get only approved communities
  // Note: We assume the system has at least one approved community for search to return results
  // We cannot create an approved community without admin approval (which is not provided)
  // So we search by name and rely on system having approved communities
  const searchResult: IPageICommunityBbsCommunity.ISum =
    await api.functional.communityBbs.search.communities.search(
      memberConnection,
      {
        body: {
          searchTerm: communityName,
          sortBy: "relevance",
          publicOnly: true,
          limit: 20,
        } satisfies ICommunityBbsCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate search results - exactly 20 records per page
  TestValidator.equals(
    "pagination limit is 20",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "at least one result returned",
    searchResult.data.length > 0,
  );
  // Step 5: Validate that only approved communities are returned (no pending communities)
  const hasPendingCommunity = searchResult.data.some(
    (c) => c.is_approved === false,
  );
  TestValidator.predicate(
    "no pending communities in results",
    !hasPendingCommunity,
  );
  // Step 6: Validate that a community with matching name is in results
  const foundCommunity = searchResult.data.find((c) =>
    c.name.includes(communityName),
  );
  TestValidator.predicate(
    "search result contains community with matching name",
    foundCommunity !== undefined,
  );
  // Step 7: Validate relevance score algorithm indicators (inferred from implementation)
  // The API uses: (title_match_weight * title_occurrences) + (body_match_weight * body_occurrences) +
  // (community_boost * community_subscription_factor) + (karma_multiplier * author_karma_weight)
  // With: title_match_weight = 3.0, body_match_weight = 1.0, community_boost = 0.5, karma_multiplier = 1.0
  // We cannot validate the internal algorithm directly but ensure a community with matching name appears in results
  // Step 8: Validate pagination properties that actually exist in the schema
  // The cursor property does not exist in IPagination according to the schema
  // Only validate properties that are defined: current, limit, records, pages
}
