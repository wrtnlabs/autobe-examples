import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_feed_retrieval_filtered_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community to filter by
  const communityConnection: api.IConnection = { host: connection.host };
  // Use a unique name that won't conflict with other tests
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  const newCommunity =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);
  // 3. Subscribe the member to the community
  const subscribeConnection: api.IConnection = { host: connection.host };
  // Ensure the connection has authentication from the logged-in member
  subscribeConnection.headers = memberConnection.headers;
  await api.functional.redditCommunity.member.communities.subscribe.create(
    subscribeConnection,
    {
      communityId: newCommunity.id,
    },
  );
  // NOTE: Cannot create posts because the API function for posting is not available in the provided SDK.
  // Per rules: we are restricted to only the functions listed. We cannot assume a post creation endpoint.
  // Therefore, we cannot create test posts on the fly. We rely on the system having existing posts.
  // We test the feed endpoint against existing data.
  // 4. Retrieve feed filtered by community with 'new' sort
  const feedConnection: api.IConnection = { host: connection.host };
  feedConnection.headers = memberConnection.headers;
  const feedRequest: IRedditCommunityPost.IRequest = {
    sort: "new",
    // IMPORTANT: According to provided IRedditCommunityPost.IRequest definition, 'community_id' is not a valid property.
    // The scenario plan incorrectly suggests community_id is in the request body.
    // In reality, the IRequest type has only: sort, timeFilter, page, limit.
    // Therefore, we omit community_id for compilation.
    // This test cannot verify community filtering due to lack of API support, but validates basic functionality.
  };
  const feedResponse = await api.functional.redditCommunity.member.posts.index(
    feedConnection,
    {
      body: feedRequest,
    },
  );
  typia.assert(feedResponse);
  // 5. Validate response:
  // - Sort order is 'new' (descending createdAt)
  // - Pagination metadata is correct
  // - Structure matches IPageIRedditCommunityPost.ISummary
  TestValidator.equals(
    "response contains expected pagination",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "response limit matches expected",
    feedResponse.pagination.limit,
    20,
  );
  // We cannot validate records count as we don't control data
  // Validate posts are sorted by created_at descending (newest first)
  for (let i = 0; i < feedResponse.data.length - 1; i++) {
    const currentPost = feedResponse.data[i];
    const nextPost = feedResponse.data[i + 1];
    TestValidator.predicate(
      "posts sorted by newest first",
      new Date(currentPost.createdAt) >= new Date(nextPost.createdAt),
    );
  }
  // Validate each post has correct structure
  for (const post of feedResponse.data) {
    // Ensure basic structure
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.predicate(
      "post id is uuid",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals("post has author", typeof post.author, "object");
    TestValidator.equals("post has community", typeof post.community, "object");
    TestValidator.equals("post has voteScore", typeof post.voteScore, "number");
    TestValidator.equals(
      "post has commentCount",
      typeof post.commentCount,
      "number",
    );
    TestValidator.equals("post has createdAt", typeof post.createdAt, "string");
    TestValidator.predicate(
      "createdAt is ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        post.createdAt,
      ),
    );
  }
}
