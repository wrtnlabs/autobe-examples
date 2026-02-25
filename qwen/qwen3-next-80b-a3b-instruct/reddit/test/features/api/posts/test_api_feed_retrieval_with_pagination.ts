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

export async function test_api_feed_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Step 2: Create multiple communities to ensure sufficient data for pagination testing
  const numCommunities = 5;
  const communityIds: string[] = [];
  const communityConnections = ArrayUtil.repeat(
    numCommunities,
    () =>
      ({
        host: connection.host,
        headers: memberConnection.headers,
      }) as api.IConnection,
  );
  await ArrayUtil.asyncForEach(communityConnections, async (conn) => {
    const community =
      await generate_random_reddit_community_member_communities_create(conn, {
        body: {
          name: RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      });
    communityIds.push(community.id);
  });
  // Step 3: Subscribe member to all communities
  for (const communityId of communityIds) {
    await api.functional.redditCommunity.member.communities.subscribe.create(
      memberConnection,
      {
        communityId,
      },
    );
  }
  // Step 4: Retrieve second page of feed with page: 2 and limit: 20
  // This assumes that sufficient posts already exist in the system for pagination testing
  const response = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 2,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // Step 5: Validate pagination metadata
  TestValidator.equals("current page is 2", response.pagination.current, 2);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records > 0",
    () => response.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages >= 1",
    () => response.pagination.pages >= 1,
  );
  // Step 6: Validate that 20 posts are returned or fewer if less data exists
  TestValidator.predicate("page has posts", () => response.data.length > 0);
  // Step 7: Validate posts are from subscribed communities
  const communityIdSet = new Set(communityIds);
  for (const post of response.data) {
    TestValidator.predicate("post belongs to subscribed community", () =>
      communityIdSet.has(post.community.id),
    );
  }
  // Step 8: Verify post ordering is by creation time (newest first)
  // Only validate ordering if we have at least 2 posts
  if (response.data.length >= 2) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentPost = new Date(response.data[i].createdAt);
      const nextPost = new Date(response.data[i + 1].createdAt);
      TestValidator.predicate(
        "posts are ordered by creation time (descending)",
        () => currentPost >= nextPost,
      );
    }
  }
}
