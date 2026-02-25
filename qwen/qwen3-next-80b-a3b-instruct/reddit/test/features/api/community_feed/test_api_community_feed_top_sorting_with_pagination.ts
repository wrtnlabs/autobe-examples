import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_community_feed_top_sorting_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Join as member to get authenticated connection
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joined);
  // Re-create member connection with the new token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = memberConnection.headers;
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      authenticatedConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create 51 high-scoring posts in the community to ensure multiple pages
  await ArrayUtil.asyncRepeat(51, async (index) => {
    const post = await generate_random_reddit_community_member_posts_create(
      authenticatedConnection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
  });
  // 4. Request third page with top sorting and limit=10
  const pageNumber = 3;
  const pageSize = 10;
  const response = await api.functional.redditCommunity.communities.feeds.index(
    authenticatedConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        page: pageNumber,
        limit: pageSize,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate feed response
  TestValidator.equals("page count", response.pagination.current, pageNumber);
  TestValidator.equals("page limit", response.pagination.limit, pageSize);
  TestValidator.predicate(
    "total records >= 51",
    response.pagination.records >= 51,
  );
  TestValidator.equals(
    "total pages",
    response.pagination.pages,
    Math.ceil(response.pagination.records / pageSize),
  );
  TestValidator.equals("data length", response.data.length, pageSize);
  // Validate posts are sorted by vote_score descending
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "posts sorted by vote_score descending",
      response.data[i].voteScore >= response.data[i + 1].voteScore,
    );
  }
}
