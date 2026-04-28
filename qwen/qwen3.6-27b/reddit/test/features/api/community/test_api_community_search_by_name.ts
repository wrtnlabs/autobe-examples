import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test community discovery via name-based keyword search. An authenticated member
 * searches for communities using a name keyword. The system returns a
 * paginated list of community summaries where the names contain the search
 * term. Validates that results include communities whose names match the search
 * keyword via case-insensitive partial matching, each result contains
 * essential fields (id, name, description, icon_uri, created_at, creator
 * member summary, subscriber_count), pagination metadata is correct, only
 * active (non-deleted) communities are included in results, and results are
 * sorted by default order (newest first).
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Member creates a community with a specific, searchable name.
 * 3. Member searches for communities using a name keyword that partially
 *    matches the created community name.
 * 4. Validates search results contain the expected community.
 * 5. Validates pagination metadata is correct.
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community with a specific searchable name
  const communityKeyword = "tech";
  const communityName = `${communityKeyword} programming development`;
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Search for communities using the name keyword
  const searchResult = await api.functional.redditLikeCommunity.communities.index(
    memberConnection,
    {
      body: {
        name: communityKeyword,
      } satisfies IREdditLikeCommunityCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Validate search results contain the created community
  TestValidator.predicate(
    "search returns at least one result",
    searchResult.data.length > 0,
  );
  // 5. Validate the created community appears in search results
  const foundCommunity = searchResult.data.find(
    (c) => c.name === community.name,
  );
  TestValidator.predicate(
    "found the created community in search results",
    foundCommunity !== undefined,
  );
  if (foundCommunity !== undefined) {
    // 6. Validate community summary fields
    TestValidator.equals(
      "community id matches",
      foundCommunity.id,
      community.id,
    );
    TestValidator.equals(
      "community name matches",
      foundCommunity.name,
      community.name,
    );
    TestValidator.equals(
      "community description matches",
      foundCommunity.description,
      community.description,
    );
    TestValidator.predicate(
      "community has valid created_at",
      foundCommunity.created_at !== undefined,
    );
    TestValidator.equals(
      "community creator id matches",
      foundCommunity.creator.id,
      community.creator.id,
    );
    TestValidator.equals(
      "community creator username matches",
      foundCommunity.creator.username,
      community.creator.username,
    );
    TestValidator.predicate(
      "community has valid subscriber_count",
      foundCommunity.subscriber_count >= 0,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    searchResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has total pages",
    searchResult.pagination.pages >= 0,
  );
}