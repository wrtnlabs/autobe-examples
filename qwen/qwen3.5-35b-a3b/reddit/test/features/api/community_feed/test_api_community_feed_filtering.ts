import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_community_feed_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // 2. Use a random community ID (assuming community exists or will be created)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts with varied types
  const textPosts: IRedditCommunityPost[] = [];
  const linkPosts: IRedditCommunityPost[] = [];
  // Create 5 text posts
  for (let i = 0; i < 5; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: `Text Post ${i + 1}`,
          post_type: "text",
          reddit_community_community_id: communityId,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    textPosts.push(post);
  }
  // Create 3 link posts
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: `Link Post ${i + 1}`,
          post_type: "link",
          reddit_community_community_id: communityId,
          link_url: `https://example${i}.com`,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    linkPosts.push(post);
  }
  // 5. Filter by postType=text
  const textFilterResponse =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          postType: "text",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(textFilterResponse);
  TestValidator.equals(
    "text filter returns only text posts",
    textFilterResponse.data.length > 0,
    true,
  );
  for (const post of textFilterResponse.data) {
    TestValidator.equals("post_type is text", post.post_type, "text");
  }
  // 6. Filter by postType=link
  const linkFilterResponse =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          postType: "link",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(linkFilterResponse);
  TestValidator.equals(
    "link filter returns only link posts",
    linkFilterResponse.data.length > 0,
    true,
  );
  for (const post of linkFilterResponse.data) {
    TestValidator.equals("post_type is link", post.post_type, "link");
  }
  // 7. Test pagination with limit=5
  const page1Response =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          limit: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals("page 1 limit is 5", page1Response.pagination.limit, 5);
  TestValidator.equals(
    "page 1 current is 1",
    page1Response.pagination.current,
    1,
  );
  const page2Response =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  // 8. Verify page 2 posts differ from page 1
  const page1Ids = new Set(page1Response.data.map((p) => p.id));
  for (const post of page2Response.data) {
    TestValidator.predicate(
      "page 2 post differs from page 1",
      !page1Ids.has(post.id),
    );
  }
  // 9. Test combined filters (postType + sort)
  const combinedFilterResponse =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          postType: "text",
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  for (const post of combinedFilterResponse.data) {
    TestValidator.equals(
      "combined filter post_type is text",
      post.post_type,
      "text",
    );
  }
  // 10. Test page beyond available range
  const excessPageResponse =
    await api.functional.redditCommunity.member.feeds.community.index(
      memberConnection,
      {
        communityId,
        body: {
          page: 999,
          limit: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(excessPageResponse);
  TestValidator.equals(
    "excess page returns empty data",
    excessPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "excess page current is 999",
    excessPageResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "excess page limit is 5",
    excessPageResponse.pagination.limit,
    5,
  );
}
